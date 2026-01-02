import { getFrameViewportInfo } from "../../../../utils/frames"

export const getViewPortInformation = ({
  pageHeight,
  pageWidth,
  frameElement,
}: {
  pageWidth: number
  pageHeight: number
  frameElement: HTMLIFrameElement
}) => {
  const viewportDimensions = getFrameViewportInfo(frameElement)

  if (
    frameElement?.contentDocument &&
    frameElement.contentWindow &&
    viewportDimensions
  ) {
    const computedWidthScale = pageWidth / (viewportDimensions.width ?? 1)
    const computedScale = Math.min(
      computedWidthScale,
      pageHeight / (viewportDimensions.height ?? 1),
    )

    return { computedScale, computedWidthScale, viewportDimensions }
  }
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
  frameElement.style.width = `${size.width}px`
  frameElement.style.height = `${size.height}px`
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

    if (frameElement.contentDocument?.documentElement) {
      frameElement.contentDocument?.documentElement.setAttribute(
        `data-prose-reader-html-renderer-has-viewport-dimensions`,
        hasViewportDimensions.toString(),
      )
    }
    // frameElement?.style.setProperty(`visibility`, `visible`)
    // frameElement?.style.setProperty(`opacity`, `1`)

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

    if (viewportDimensions) {
      frameElement?.style.setProperty(`position`, `absolute`)
      frameElement?.style.setProperty(`top`, `50%`)

      if (spreadPosition === `left`) {
        frameElement?.style.setProperty(`right`, `0`)
        frameElement?.style.removeProperty(`left`)
      } else if (blankPagePosition === `before` && isRTL) {
        frameElement?.style.setProperty(`right`, `50%`)
        frameElement?.style.removeProperty(`left`)
      } else if (spreadPosition === `right`) {
        frameElement?.style.setProperty(`left`, `0`)
        frameElement?.style.removeProperty(`right`)
      } else {
        frameElement?.style.setProperty(
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
        frameElement?.style.removeProperty(`right`)
      }
      const transformTranslateX = spreadPosition !== `none` ? `0` : `-50%`
      const transformOriginX =
        spreadPosition === `right` && blankPagePosition !== `before`
          ? `left`
          : spreadPosition === `left` ||
              (blankPagePosition === `before` && isRTL)
            ? `right`
            : `center`
      frameElement?.style.setProperty(
        `transform`,
        `translate(${transformTranslateX}, -50%) scale(${computedScale})`,
      )
      frameElement?.style.setProperty(
        `transform-origin`,
        `${transformOriginX} center`,
      )
    } else {
      if (blankPagePosition === `before`) {
        if (isRTL) {
          frameElement?.style.setProperty(`margin-right`, `${pageWidth}px`)
        } else {
          frameElement?.style.setProperty(`margin-left`, `${pageWidth}px`)
        }
      } else {
        frameElement?.style.removeProperty(`margin-left`)
        frameElement?.style.removeProperty(`margin-right`)
      }
    }

    return { width: minimumWidth, height: contentHeight }
  }

  return { width: minimumWidth, height: pageHeight }
}
