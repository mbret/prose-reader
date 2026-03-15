import { getViewPortInformation } from "../viewport"

/**
 * Base iframe positioning/sizing styles are renderer-owned for pre-paginated items.
 * Under this contract we can skip the whole style pass when layout-driving inputs
 * did not change.
 */
const prePaginatedLayoutCache = new WeakMap<HTMLIFrameElement, string>()

const setFrameStyle = (
  frameElement: HTMLIFrameElement,
  property: string,
  value: string,
) => {
  if (frameElement.style.getPropertyValue(property) === value) return

  frameElement.style.setProperty(property, value)
}

const removeFrameStyle = (
  frameElement: HTMLIFrameElement,
  property: string,
) => {
  if (frameElement.style.getPropertyValue(property) === ``) return

  frameElement.style.removeProperty(property)
}

/**
 * Upward layout is used when the parent wants to manipulate the iframe without triggering
 * `layout` event. This is a particular case needed for iframe because the parent can layout following
 * an iframe `layout` event. Because the parent `layout` may change some of iframe properties we do not
 * want the iframe to trigger a new `layout` even and have infinite loop.
 */
const staticLayout = (
  frameElement: HTMLIFrameElement,
  size: { width: number; height: number },
) => {
  const width = `${size.width}px`
  const height = `${size.height}px`

  if (frameElement.style.width !== width) {
    frameElement.style.width = width
  }

  if (frameElement.style.height !== height) {
    frameElement.style.height = height
  }
}

const setHtmlAttribute = (
  frameElement: HTMLIFrameElement,
  name: string,
  value: string,
) => {
  const htmlElement = frameElement.contentDocument?.documentElement

  if (!htmlElement) return
  if (htmlElement.getAttribute(name) === value) return

  htmlElement.setAttribute(name, value)
}

const getPrePaginatedLayoutCacheKey = ({
  hasViewportDimensions,
  viewportWidth,
  viewportHeight,
  computedScale,
  spreadPosition,
  blankPagePosition,
  isRTL,
  pageWidth,
  pageHeight,
}: {
  hasViewportDimensions: boolean
  viewportWidth: number | undefined
  viewportHeight: number | undefined
  computedScale: number
  spreadPosition: `none` | `left` | `right`
  blankPagePosition: `before` | `after` | `none`
  isRTL: boolean
  pageWidth: number
  pageHeight: number
}) =>
  [
    hasViewportDimensions ? `1` : `0`,
    viewportWidth ?? ``,
    viewportHeight ?? ``,
    computedScale,
    spreadPosition,
    blankPagePosition,
    isRTL ? `1` : `0`,
    pageWidth,
    pageHeight,
  ].join(`|`)

/**
 * Applies renderer-owned iframe base styles for pre-paginated layout.
 * This is only called when layout-driving inputs changed; external root-level
 * style mutation is intentionally out of contract until explicit hooks exist.
 */
const applyPrePaginatedFrameStyles = ({
  frameElement,
  viewportDimensions,
  computedScale,
  spreadPosition,
  blankPagePosition,
  isRTL,
  pageWidth,
}: {
  frameElement: HTMLIFrameElement
  viewportDimensions:
    | {
        hasViewport: boolean
        width?: number
        height?: number
      }
    | undefined
  computedScale: number
  spreadPosition: `none` | `left` | `right`
  blankPagePosition: `before` | `after` | `none`
  isRTL: boolean
  pageWidth: number
}) => {
  if (viewportDimensions) {
    setFrameStyle(frameElement, `position`, `absolute`)
    setFrameStyle(frameElement, `top`, `50%`)

    if (spreadPosition === `left`) {
      setFrameStyle(frameElement, `right`, `0`)
      removeFrameStyle(frameElement, `left`)
    } else if (blankPagePosition === `before` && isRTL) {
      setFrameStyle(frameElement, `right`, `50%`)
      removeFrameStyle(frameElement, `left`)
    } else if (spreadPosition === `right`) {
      setFrameStyle(frameElement, `left`, `0`)
      removeFrameStyle(frameElement, `right`)
    } else {
      setFrameStyle(
        frameElement,
        `left`,
        blankPagePosition === `before`
          ? isRTL
            ? `25%`
            : `75%`
          : blankPagePosition === `after`
            ? isRTL
              ? `75%`
              : `25%`
            : `50%`,
      )
      removeFrameStyle(frameElement, `right`)
    }

    const transformTranslateX = spreadPosition !== `none` ? `0` : `-50%`
    const transformOriginX =
      spreadPosition === `right` && blankPagePosition !== `before`
        ? `left`
        : spreadPosition === `left` || (blankPagePosition === `before` && isRTL)
          ? `right`
          : `center`

    setFrameStyle(
      frameElement,
      `transform`,
      `translate(${transformTranslateX}, -50%) scale(${computedScale})`,
    )
    setFrameStyle(
      frameElement,
      `transform-origin`,
      `${transformOriginX} center`,
    )
    return
  }

  if (blankPagePosition === `before`) {
    if (isRTL) {
      setFrameStyle(frameElement, `margin-right`, `${pageWidth}px`)
    } else {
      setFrameStyle(frameElement, `margin-left`, `${pageWidth}px`)
    }
  } else {
    removeFrameStyle(frameElement, `margin-left`)
    removeFrameStyle(frameElement, `margin-right`)
  }
}

export const renderPrePaginated = ({
  minPageSpread,
  blankPagePosition,
  spreadPosition,
  pageHeight,
  pageWidth,
  frameElement,
  isRTL,
}: {
  minPageSpread: number
  blankPagePosition: `before` | `after` | `none`
  spreadPosition: `none` | `left` | `right`
  pageWidth: number
  pageHeight: number
  frameElement?: HTMLIFrameElement
  isRTL: boolean
}) => {
  const minimumWidth = minPageSpread * pageWidth

  if (frameElement?.contentDocument && frameElement?.contentWindow) {
    const { viewportDimensions, computedScale = 1 } =
      getViewPortInformation({ frameElement, pageHeight, pageWidth }) ?? {}
    const hasViewportDimensions = !!viewportDimensions
    const contentWidth = pageWidth
    const contentHeight = pageHeight
    const layoutCacheKey = getPrePaginatedLayoutCacheKey({
      hasViewportDimensions,
      viewportWidth: viewportDimensions?.width,
      viewportHeight: viewportDimensions?.height,
      computedScale,
      spreadPosition,
      blankPagePosition,
      isRTL,
      pageWidth,
      pageHeight,
    })

    if (prePaginatedLayoutCache.get(frameElement) === layoutCacheKey) {
      return { width: minimumWidth, height: contentHeight }
    }

    prePaginatedLayoutCache.set(frameElement, layoutCacheKey)

    setHtmlAttribute(
      frameElement,
      `data-prose-reader-html-renderer-has-viewport-dimensions`,
      hasViewportDimensions.toString(),
    )

    if (viewportDimensions) {
      staticLayout(frameElement, {
        width: viewportDimensions.width ?? 1,
        height: viewportDimensions.height ?? 1,
      })
    } else {
      staticLayout(frameElement, {
        width: contentWidth,
        height: contentHeight,
      })
    }

    applyPrePaginatedFrameStyles({
      frameElement,
      viewportDimensions,
      computedScale,
      spreadPosition,
      blankPagePosition,
      isRTL,
      pageWidth,
    })

    return { width: minimumWidth, height: contentHeight }
  }

  return { width: minimumWidth, height: pageHeight }
}
