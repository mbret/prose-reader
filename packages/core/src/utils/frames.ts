import {
  defer,
  EMPTY,
  endWith,
  from,
  fromEvent,
  map,
  type Observable,
  of,
  switchMap,
  take,
  timeout,
} from "rxjs"
import {
  injectCSS as injectCSSToDocument,
  removeCSS as removeCSSToDocument,
} from "./dom"

const getAttributeTokenFromString = (string: string, key: string) => {
  const regExp = new RegExp(`${key}\\s*=\\s*([^,\\s]+)`, `i`)

  return string.match(regExp)?.[1]?.trim().toLowerCase()
}

export const getAttributeValueFromString = (string: string, key: string) => {
  const token = getAttributeTokenFromString(string, key)

  if (!token) return 0

  const parsedValue = Number.parseFloat(token)

  return Number.isFinite(parsedValue) ? parsedValue : 0
}

export const injectCSSToFrame = (
  frameElement: HTMLIFrameElement,
  id: string,
  style: string,
  prepend?: boolean,
) => {
  if (!frameElement?.contentDocument?.head) return

  injectCSSToDocument(frameElement.contentDocument, id, style, prepend)
}

export const removeCSS = (frameElement: HTMLIFrameElement, id: string) => {
  if (!frameElement?.contentDocument) return

  removeCSSToDocument(frameElement.contentDocument, id)
}

export const upsertCSSToFrame = (
  frameElement: HTMLIFrameElement | undefined,
  id: string,
  style: string,
  prepend?: boolean,
) => {
  if (!frameElement) return

  const existingElement = frameElement?.contentDocument?.getElementById(
    id,
  ) as HTMLStyleElement

  if (existingElement) {
    if (existingElement.textContent !== style) {
      existingElement.textContent = style
    }
    return
  }

  injectCSSToFrame(frameElement, id, style, prepend)
}

export const getFrameViewportInfo = (frame: HTMLIFrameElement | undefined) => {
  if (frame?.contentDocument) {
    const doc = frame.contentDocument
    const viewportMetaElement = doc.querySelector(`meta[name='viewport']`)

    if (viewportMetaElement) {
      const viewportContent = viewportMetaElement.getAttribute(`content`)

      if (viewportContent) {
        const widthToken = getAttributeTokenFromString(viewportContent, `width`)
        const heightToken = getAttributeTokenFromString(
          viewportContent,
          `height`,
        )
        const width = getAttributeValueFromString(viewportContent, `width`)
        const height = getAttributeValueFromString(viewportContent, `height`)

        if (width > 0 && height > 0) {
          return {
            hasViewport: true,
            widthToken,
            heightToken,
            width: width,
            height: height,
          }
        }
        return { hasViewport: true, widthToken, heightToken }
      }
    }
  }

  return { hasViewport: false }
}

export const waitForFrameLoad = (stream: Observable<HTMLIFrameElement>) =>
  stream.pipe(
    switchMap((frame) => {
      if (
        frame.src === "about:blank" &&
        frame.contentDocument?.readyState === "complete" &&
        frame.contentDocument.body
      ) {
        return of(frame)
      }

      return fromEvent(frame, `load`).pipe(
        take(1),
        map(() => frame),
      )
    }),
  )

/** Bounds a font whose request never ends, such as a stalled response. */
const FONT_LOAD_TIMEOUT_MS = 5_000

/**
 * Completes once no font the document lays its text out with is loading.
 * Laying the text out requests its fonts, and each is waited for itself:
 * WebKit settles `document.fonts.ready` once a font has been loading for
 * longer than its block period, before it is in. A font that comes in can
 * change which others the text needs, such as for a glyph it lacks, so the
 * text is laid out again until none is loading. Each font is waited for once,
 * up to 5 seconds, so the wait ends whatever a browser reports after. A font
 * that fails, or is not in by then, leaves the text in its fallback.
 */
const waitForDocumentFonts = (
  document: Document,
  awaitedFonts: ReadonlySet<FontFace> = new Set(),
): Observable<never> =>
  defer(() => {
    // Measuring the root lays the document out, which requests its fonts.
    document.documentElement?.getBoundingClientRect()

    const loadingFonts = Array.from(document.fonts).filter(
      (font) => font.status === `loading` && !awaitedFonts.has(font),
    )

    if (!loadingFonts.length) return EMPTY

    return from(
      Promise.allSettled(loadingFonts.map((font) => font.loaded)),
    ).pipe(
      timeout({ first: FONT_LOAD_TIMEOUT_MS, with: () => of(undefined) }),
      switchMap(() =>
        waitForDocumentFonts(
          document,
          new Set([...awaitedFonts, ...loadingFonts]),
        ),
      ),
    )
  })

/**
 * Emits the frame once its document can be measured and shown: its text is
 * laid out with the fonts it uses.
 */
export const waitForFrameReady = (stream: Observable<HTMLIFrameElement>) =>
  stream.pipe(
    switchMap((frame) => {
      const document = frame.contentDocument

      if (!document) return of(frame)

      return waitForDocumentFonts(document).pipe(endWith(frame))
    }),
  )
