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

/**
 * A stylesheet is served from a blob already in memory, so it loads in
 * moments. This only bounds a browser that never reports on one, so that a
 * single link cannot keep the document loading forever.
 */
const STYLESHEET_LOAD_TIMEOUT_MS = 5_000

/** The `url()` tokens of a css rule, quoted or not. */
const CSS_URL = /url\(\s*(['"]?)(.*?)\1\s*\)/g

type DocumentView = Window & typeof globalThis

/**
 * Resolves `path` the way the browser would for a resource loaded from
 * `base`: the document's href for its elements, the stylesheet's href for
 * its rules. Both are loaded from blobs, against which no relative
 * reference resolves, so we resolve against their manifest href instead.
 *
 * @important Firefox handles file protocol weirdly and will not
 * go up one directory when using "../". We temporarily replace to http://
 * to keep our behavior.
 */
const joinPath = (base: string, path: string) => {
  // Temporarily replace file:// with http:// for consistent URL handling
  const isFileProtocol = base.startsWith("file://")
  const tempBase = isFileProtocol ? base.replace("file://", "http://") : base
  const result = new URL(path, tempBase).toString()

  // Convert back to file:// if needed
  return isFileProtocol ? result.replace("http://", "file://") : result
}

/**
 * The content of the manifest item at `url`, when it is served as a
 * response. An item served as a url, or a url the manifest does not have,
 * gives nothing and the reference is left as is.
 */
const createAssetFetcher = (
  manifest: Manifest,
  settings: ReaderSettingsManager,
) => {
  const itemsByHref = new Map(
    manifest.items.map((item) => [item.href.toLowerCase(), item]),
  )

  return (url: string): Observable<Blob> => {
    const item = itemsByHref.get(url.toLowerCase())

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
 * Whether the browser fetches this link once its href is set, and so reports
 * on it with `load` or `error`. It only does for the relations it processes,
 * and a stylesheet is the only one the document waits for: its styles have to
 * apply before layout, and its font faces can only be rewritten once it is
 * parsed. Any other link, such as an EPUB 3 pronunciation lexicon
 * (`rel="pronunciation"`), is never fetched and no event ever comes.
 *
 * A stylesheet is not fetched either when it is disabled or typed as anything
 * but css.
 *
 * @see https://html.spec.whatwg.org/multipage/links.html#link-type-stylesheet
 */
const isFetchedStylesheet = (
  element: Element,
  view: DocumentView,
): element is HTMLLinkElement => {
  if (!(element instanceof view.HTMLLinkElement)) return false

  const mimeType = element.type.split(";")[0]?.trim().toLowerCase()

  return (
    element.relList.contains("stylesheet") &&
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
    timeout({
      first: STYLESHEET_LOAD_TIMEOUT_MS,
      with: () =>
        throwError(
          () =>
            new Error(
              `the stylesheet did not load within ${STYLESHEET_LOAD_TIMEOUT_MS}ms`,
            ),
        ),
    }),
    first(),
    map(() => link.sheet),
  )

/**
 * A font face's `url()` resolves against its stylesheet, which is a blob, so
 * each one is swapped for a blob of the manifest item it names. The rule is
 * replaced rather than edited, which Firefox does not allow.
 *
 * Object urls are only created once every font of a rule is in, so an
 * unsubscription midway leaves none behind that unload would not revoke.
 */
const rewriteFontFaces = ({
  sheet,
  sheetUrl,
  view,
  fetchAsset,
}: {
  sheet: CSSStyleSheet
  sheetUrl: string
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
        defer(() => fetchAsset(joinPath(sheetUrl, reference))).pipe(
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

/**
 * Points the element at a blob of the manifest item it references, and for a
 * stylesheet, waits for it to apply and rewrites its font faces.
 *
 * It never errors: a missing or broken asset is reported and the document
 * loads without it, the way a browser renders a page whose image is missing.
 */
const loadElementAsset = ({
  element,
  documentUrl,
  view,
  fetchAsset,
}: {
  element: Element
  documentUrl: string
  view: DocumentView
  fetchAsset: FetchAsset
}): Observable<never> => {
  const attribute = ["src", "href"].find((name) => element.getAttribute(name))
  const reference = attribute && element.getAttribute(attribute)

  if (!attribute || !reference) return EMPTY

  return defer(() => {
    const url = joinPath(documentUrl, reference)

    return fetchAsset(url).pipe(
      switchMap((blob) => {
        element.setAttribute(attribute, view.URL.createObjectURL(blob))

        if (!isFetchedStylesheet(element, view)) return EMPTY

        // `load` and `error` are dispatched from a task, so listening right
        // after the swap cannot miss them.
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

        if (!document || !view) return of(frameElement)

        const fetchAsset = createAssetFetcher(context.manifest, settings)

        const assetLoads = getElementsWithAssets(document).map((element) =>
          loadElementAsset({
            element,
            documentUrl: item.href,
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
