import type { Manifest } from "@prose-reader/shared"
import {
  catchError,
  defaultIfEmpty,
  defer,
  EMPTY,
  endWith,
  first,
  forkJoin,
  from,
  fromEvent,
  ignoreElements,
  map,
  merge,
  mergeMap,
  type Observable,
  of,
  switchMap,
  throwError,
  timeout,
} from "rxjs"
import type { Context } from "../../../context/Context"
import { Report } from "../../../report"
import type { ReaderSettingsManager } from "../../../settings/ReaderSettingsManager"
import { ResourceHandler } from "../../../spineItem/resources/ResourceHandler"
import { getElementsWithAssets, revokeDocumentBlobs } from "../../../utils/dom"

/** Bounds a browser that never reports on a stylesheet. */
const STYLESHEET_LOAD_TIMEOUT_MS = 5_000

const CSS_URL = /url\(\s*(['"]?)(.*?)\1\s*\)/g

type DocumentView = Window & typeof globalThis

/**
 * Archive hrefs are `file://` or bare paths, and neither resolves a relative
 * reference (`file://` reads the first folder as a host), so they resolve
 * under this root instead.
 */
const ARCHIVE_ROOT = `http://archive.invalid/`

const toResourceUrl = (href: string) => {
  try {
    return new URL(href.replace(/^file:\/\//, ``), ARCHIVE_ROOT)
  } catch {
    return undefined
  }
}

/** Gives nothing for a url missing from the manifest or served as a url. */
const createAssetFetcher = (
  manifest: Manifest,
  settings: ReaderSettingsManager,
) => {
  const itemsByUrl = new Map<string, Manifest["items"][number]>()

  for (const item of manifest.items) {
    const key = toResourceUrl(item.href)?.href.toLowerCase()

    if (key && !itemsByUrl.has(key)) itemsByUrl.set(key, item)
  }

  return (url: URL): Observable<Blob> => {
    const item = itemsByUrl.get(url.href.toLowerCase())

    if (!item) return EMPTY

    return from(new ResourceHandler(item, settings).getResource()).pipe(
      mergeMap((resource) =>
        resource instanceof Response ? from(resource.blob()) : EMPTY,
      ),
    )
  }
}

type FetchAsset = ReturnType<typeof createAssetFetcher>

/**
 * The browser only fetches, and reports `load` or `error` for, the links it
 * processes. Waiting on any other (eg: `rel="pronunciation"`) never ends.
 * @see https://html.spec.whatwg.org/multipage/links.html#link-type-stylesheet
 */
const isFetchedStylesheet = (
  element: Element,
  view: DocumentView,
): element is HTMLLinkElement => {
  if (!(element instanceof view.HTMLLinkElement)) return false

  const mimeType = element.type.split(";")[0]?.trim().toLowerCase()
  // link types are case-insensitive, the token list is not
  const relations = Array.from(element.relList, (token) => token.toLowerCase())

  return (
    relations.includes("stylesheet") &&
    !element.hasAttribute("disabled") &&
    (!mimeType || mimeType === "text/css")
  )
}

const waitForStylesheet = (link: HTMLLinkElement) =>
  merge(
    fromEvent(link, "load"),
    fromEvent(link, "error").pipe(
      mergeMap(() => throwError(() => new Error(`the stylesheet failed`))),
    ),
  ).pipe(
    timeout({ first: STYLESHEET_LOAD_TIMEOUT_MS }),
    first(),
    map(() => link.sheet),
  )

/**
 * Rules are replaced rather than edited, which Firefox does not allow. Object
 * urls are only created once all of a rule's fonts are in, so none leak when
 * unsubscribed midway.
 */
const rewriteFontFaces = ({
  sheet,
  sheetUrl,
  view,
  fetchAsset,
}: {
  sheet: CSSStyleSheet
  sheetUrl: URL
  view: DocumentView
  fetchAsset: FetchAsset
}): Observable<never> =>
  defer(() => {
    const fontFaces = Array.from(sheet.cssRules).filter(
      (rule) => rule instanceof view.CSSFontFaceRule,
    )

    const rewrites = fontFaces.map((rule) => {
      const references = Array.from(
        rule.cssText.matchAll(CSS_URL),
        ([, , reference = ``]) => reference,
      )

      const fonts = references.map((reference) =>
        defer(() => fetchAsset(new URL(reference, sheetUrl))).pipe(
          catchError((error) => {
            Report.warn(`Could not load font ${reference}`, error)

            return EMPTY
          }),
          defaultIfEmpty(undefined),
        ),
      )

      return forkJoin(fonts).pipe(
        map((blobs) => {
          const index = Array.from(sheet.cssRules).indexOf(rule)

          if (index === -1 || blobs.every((blob) => !blob)) return

          let tokenIndex = 0
          const cssText = rule.cssText.replace(CSS_URL, (token) => {
            const blob = blobs[tokenIndex++]

            return blob ? `url("${view.URL.createObjectURL(blob)}")` : token
          })

          sheet.deleteRule(index)
          sheet.insertRule(cssText, index)
        }),
      )
    })

    return merge(...rewrites).pipe(ignoreElements())
  })

/** Never errors: a failed asset is reported and the document loads without it. */
const loadElementAsset = ({
  element,
  documentUrl,
  view,
  fetchAsset,
}: {
  element: Element
  documentUrl: URL
  view: DocumentView
  fetchAsset: FetchAsset
}): Observable<never> => {
  const attribute = ["src", "href"].find((name) => element.getAttribute(name))
  const reference = attribute && element.getAttribute(attribute)

  if (!attribute || !reference) return EMPTY

  return defer(() => {
    const url = new URL(reference, documentUrl)

    return fetchAsset(url).pipe(
      switchMap((blob) => {
        element.setAttribute(attribute, view.URL.createObjectURL(blob))

        if (!isFetchedStylesheet(element, view)) return EMPTY

        // `load` is dispatched from a task, after this subscribes
        return waitForStylesheet(element).pipe(
          switchMap((sheet) =>
            sheet
              ? rewriteFontFaces({ sheet, sheetUrl: url, view, fetchAsset })
              : EMPTY,
          ),
        )
      }),
    )
  }).pipe(
    catchError((error) => {
      Report.warn(`Could not load asset ${reference}`, error)

      return EMPTY
    }),
  )
}

export const loadAssets =
  ({
    settings,
    item,
    context,
  }: {
    settings: ReaderSettingsManager
    item: Manifest["items"][number]
    context: Context
  }) =>
  (stream: Observable<HTMLIFrameElement>) =>
    stream.pipe(
      switchMap((frameElement) => {
        const document = frameElement.contentDocument
        const view = document?.defaultView
        const documentUrl = toResourceUrl(item.href)

        if (!document || !view || !documentUrl) return of(frameElement)

        const fetchAsset = createAssetFetcher(context.manifest, settings)

        const assetLoads = getElementsWithAssets(document).map((element) =>
          loadElementAsset({
            element,
            documentUrl,
            view,
            fetchAsset,
          }),
        )

        return merge(...assetLoads).pipe(endWith(frameElement))
      }),
    )

export const unloadAssets = (frameElement?: HTMLIFrameElement) => {
  revokeDocumentBlobs(frameElement?.contentDocument)
}
