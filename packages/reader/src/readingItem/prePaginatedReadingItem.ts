import { Context } from "../context"
import { Manifest } from "../types"
import { createCommonReadingItem } from "./commonReadingItem"

export const createPrePaginatedReadingItem = ({ item, context, containerElement, iframeEventBridgeElement }: {
  item: Manifest['readingOrder'][number],
  containerElement: HTMLElement,
  iframeEventBridgeElement: HTMLElement,
  context: Context,
}) => {
  const commonReadingItem = createCommonReadingItem({ context, item, containerElement, iframeEventBridgeElement })
  let readingItemFrame = commonReadingItem.readingItemFrame

  const getDimensions = () => {
    const pageSize = context.getPageSize()
    const pageWidth = pageSize.width
    const columnHeight = pageSize.height
    const horizontalMargin = 0
    const columnWidth = pageWidth

    return { columnHeight, columnWidth, horizontalMargin }
  }

  const applySize = ({ blankPagePosition, minimumWidth }: { blankPagePosition: `before` | `after` | `none`, minimumWidth: number }) => {
    const { width: pageWidth, height: pageHeight } = context.getPageSize()
    const { viewportDimensions, computedScale } = commonReadingItem.getViewPortInformation()
    const visibleArea = context.getVisibleAreaRect()
    const frameElement = readingItemFrame.getManipulableFrame()?.frame

    if (readingItemFrame?.getIsLoaded() && frameElement?.contentDocument && frameElement?.contentWindow) {
      let contentWidth = pageWidth
      const contentHeight = visibleArea.height + context.getCalculatedInnerMargin()

      const cssLink = buildDocumentStyle(getDimensions(), viewportDimensions)

      frameElement?.style.setProperty(`visibility`, `visible`)
      frameElement?.style.setProperty(`opacity`, `1`)

      if (viewportDimensions) {
        commonReadingItem.injectStyle(readingItemFrame, cssLink)
        readingItemFrame.staticLayout({
          width: viewportDimensions.width,
          height: viewportDimensions.height,
        })
        frameElement?.style.setProperty('--scale', `${computedScale}`)
        frameElement?.style.setProperty('position', `absolute`)
        frameElement?.style.setProperty(`top`, `50%`)
        frameElement?.style.setProperty(`left`,
          blankPagePosition === `before`
            ? context.isRTL() ? `25%` : `75%`
            : blankPagePosition === `after`
              ? context.isRTL() ? `75%` : `25%`
              : `50%`
        )
        frameElement?.style.setProperty(`transform`, `translate(-50%, -50%) scale(${computedScale})`)
        frameElement?.style.setProperty(`transform-origin`, `center center`)
      } else {
        commonReadingItem.injectStyle(readingItemFrame, cssLink)
        readingItemFrame.staticLayout({
          width: contentWidth,
          height: contentHeight,
        })
      }

      commonReadingItem.layout({ width: minimumWidth, height: contentHeight, minimumWidth, blankPagePosition })

      return { width: minimumWidth, height: contentHeight }
    } else {
      commonReadingItem.layout({ width: minimumWidth, height: pageHeight, minimumWidth, blankPagePosition })
    }

    return { width: minimumWidth, height: pageHeight }
  }

  const layout = (layoutInformation: { blankPagePosition: `before` | `after` | `none`, minimumWidth: number }) => {
    return applySize(layoutInformation)
  }

  const destroy = () => {
    commonReadingItem.destroy()
  }

  return {
    ...commonReadingItem,
    layout,
    destroy,
  }
}

const buildDocumentStyle = ({ columnWidth }: {
  columnWidth: number,
  columnHeight: number,
  horizontalMargin: number
}, viewportDimensions: { height: number, width: number } | undefined) => {
  return `
    body {
      
    }
    body {
      margin: 0;
    }
    ${/*
      might be html * but it does mess up things like figure if so.
      check accessible_epub_3
    */``}
    html, body {
      height: 100%;
      width: 100%;
    }
    ${/*
      This one is important for preventing 100% img to resize above
      current width. Especially needed for cbz conversion
    */``}
    html, body {
      -max-width: ${columnWidth}px !important;
    }
    ${
    /*
     * @see https://hammerjs.github.io/touch-action/
     */
    ``}
    html, body {
      touch-action: none;
    }
    ${/*
      prevent drag of image instead of touch on firefox
    */``}
    img {
      user-select: none;
      ${/*
        prevent weird overflow or margin. Try `block` if `flex` has weird behavior
      */``}
      display: flex;
      ${/*
        If the document does not have viewport, we cannot scale anything inside.
        This should never happens with a valid epub document however it will happens if
        we load .jpg, .png, etc directly in the iframe. This is expected, in this case we force
        the inner content to display correctly.
      */``}
      ${!viewportDimensions ? `
        width: 100%;
        height:100%;
        object-fit:contain;
      ` : ``}
    }
  `
}