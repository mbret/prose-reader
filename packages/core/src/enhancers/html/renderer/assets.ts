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

/** Bounds a browser that never reports on a stylesheet. */
const STYLESHEET_LOAD_TIMEOUT_MS = 5_000

const CSS_URL = /url\(\s*(['"]?)(.*?)\1\s*\)/g

const SVG_NAMESPACE = `http://www.w3.org/2000/svg`
const XLINK_NAMESPACE = `http://www.w3.org/1999/xlink`

const ELEMENTS_WITH_ASSET_SELECTOR = [
  `img`,
  `video`,
  `audio`,
  // within video and audio
  `source`,
  // stylesheets and other linked resources
  `link`,
  `script`,
  // SVG pictures
  `image`,
].join(`,`)

type DocumentView = Window & typeof globalThis

/**
 * The attribute an element references its asset with, which the asset's blob
 * url replaces and is revoked from. An SVG `<image>` uses `href`, or the XLink
 * `href` of SVG 1.1, which an `href` overrides.
 * @see https://www.w3.org/TR/SVG2/linking.html#XLinkRefAttrs
 */
const getAssetReferenceAttribute = (element: Element) => {
  const attribute =
    element.namespaceURI === SVG_NAMESPACE
      ? (element.getAttributeNodeNS(null, `href`) ??
        element.getAttributeNodeNS(XLINK_NAMESPACE, `href`))
      : (element.getAttributeNode(`src`) ?? element.getAttributeNode(`href`))

  return attribute?.value ? attribute : undefined
}

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
  const referenceAttribute = getAssetReferenceAttribute(element)

  if (!referenceAttribute) return EMPTY

  const reference = referenceAttribute.value

  return defer(() => {
    const url = new URL(reference, documentUrl)

    return fetchAsset(url).pipe(
      switchMap((blob) => {
        element.setAttributeNS(
          referenceAttribute.namespaceURI,
          referenceAttribute.name,
          view.URL.createObjectURL(blob),
        )

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

        const assetLoads = Array.from(
          document.querySelectorAll(ELEMENTS_WITH_ASSET_SELECTOR),
          (element) =>
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

/**
 * Some stylesheets cannot be read, legitimately: a cross-origin one, or one
 * the book lists but does not contain.
 */
const getReadableRules = (sheet: CSSStyleSheet) => {
  try {
    return Array.from(sheet.cssRules)
  } catch (error) {
    Report.warn(`Error getting rules for sheet: ${sheet.href}`, error)

    return []
  }
}

/**
 * Revokes every blob url the frame's document references an asset or a font
 * with: those `loadAssets` swapped in, and the picture a generated image page
 * is written with.
 */
export const unloadAssets = (frameElement?: HTMLIFrameElement) => {
  const document = frameElement?.contentDocument
  const view = document?.defaultView

  if (!document || !view) return

  for (const element of document.querySelectorAll(
    ELEMENTS_WITH_ASSET_SELECTOR,
  )) {
    const url = getAssetReferenceAttribute(element)?.value

    if (url?.startsWith(`blob:`)) view.URL.revokeObjectURL(url)
  }

  for (const sheet of document.styleSheets) {
    for (const rule of getReadableRules(sheet)) {
      if (!(rule instanceof view.CSSFontFaceRule)) continue

      // eg: `url("font.woff2") format("woff2"), url(blob:http://example.com/1234) format("opentype")`
      const fontUrls = rule.style
        .getPropertyValue(`src`)
        .match(/blob:[^,\s'")]+/g)

      for (const url of fontUrls ?? []) view.URL.revokeObjectURL(url)
    }
  }
}
