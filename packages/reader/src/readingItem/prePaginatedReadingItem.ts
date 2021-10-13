import { BehaviorSubject, Observable } from "rxjs"
import { Context } from "../context"
import { Manifest } from "../types"
import { Hook } from "../types/Hook"
import { createCommonReadingItem } from "./commonReadingItem"

export const createPrePaginatedReadingItem = ({ item, context, containerElement, iframeEventBridgeElement, hooks$, viewportState$ }: {
  item: Manifest[`readingOrder`][number],
  containerElement: HTMLElement,
  iframeEventBridgeElement: HTMLElement,
  context: Context,
  hooks$: BehaviorSubject<Hook[]>,
  viewportState$: Observable<`free` | `busy`>
}) => {
  const commonReadingItem = createCommonReadingItem({ context, item, containerElement, iframeEventBridgeElement, hooks$, viewportState$ })
  const readingItemFrame = commonReadingItem.readingItemFrame

  const getDimensions = () => {
    const pageSize = context.getPageSize()
    const pageWidth = pageSize.width
    const columnHeight = pageSize.height
    const horizontalMargin = 0
    const columnWidth = pageWidth

    return { columnHeight, columnWidth, horizontalMargin }
  }

  const applySize = ({ blankPagePosition, minimumWidth, spreadPosition }: { blankPagePosition: `before` | `after` | `none`, minimumWidth: number, spreadPosition: `none` | `left` | `right` }) => {
    const { width: pageWidth, height: pageHeight } = context.getPageSize()
    const { viewportDimensions, computedScale } = commonReadingItem.getViewPortInformation()
    const visibleArea = context.getVisibleAreaRect()
    const frameElement = readingItemFrame.getManipulableFrame()?.frame

    if (readingItemFrame?.getIsLoaded() && frameElement?.contentDocument && frameElement?.contentWindow) {
      const contentWidth = pageWidth
      const contentHeight = visibleArea.height + context.getCalculatedInnerMargin()

      const cssLink = buildDocumentStyle({
        ...getDimensions(),
        enableTouch: context.getSettings().computedPageTurnMode !== `free`,
        spreadPosition
      }, viewportDimensions)

      frameElement?.style.setProperty(`visibility`, `visible`)
      frameElement?.style.setProperty(`opacity`, `1`)

      if (viewportDimensions) {
        commonReadingItem.injectStyle(readingItemFrame, cssLink)
        readingItemFrame.staticLayout({
          width: viewportDimensions.width,
          height: viewportDimensions.height
        })
        frameElement?.style.setProperty(`--scale`, `${computedScale}`)
        frameElement?.style.setProperty(`position`, `absolute`)
        frameElement?.style.setProperty(`top`, `50%`)
        if (spreadPosition === `left`) {
          frameElement?.style.setProperty(`right`, `0`)
          frameElement?.style.removeProperty(`left`)
        } else if (blankPagePosition === `before` && context.isRTL()) {
          frameElement?.style.setProperty(`right`, `50%`)
          frameElement?.style.removeProperty(`left`)
        } else if (spreadPosition === `right`) {
          frameElement?.style.setProperty(`left`, `0`)
          frameElement?.style.removeProperty(`right`)
        } else {
          frameElement?.style.setProperty(`left`,
            blankPagePosition === `before`
              ? context.isRTL() ? `25%` : `75%`
              : blankPagePosition === `after`
                ? context.isRTL() ? `75%` : `25%`
                : `50%`
          )
          frameElement?.style.removeProperty(`right`)
        }
        const transformTranslateX =
          spreadPosition !== `none`
            ? `0`
            : `-50%`
        const transformOriginX =
          (spreadPosition === `right` && blankPagePosition !== `before`)
            ? `left`
            : (spreadPosition === `left` || (blankPagePosition === `before` && context.isRTL()))
                ? `right`
                : `center`
        frameElement?.style.setProperty(`transform`, `translate(${transformTranslateX}, -50%) scale(${computedScale})`)
        frameElement?.style.setProperty(`transform-origin`, `${transformOriginX} center`)
      } else {
        commonReadingItem.injectStyle(readingItemFrame, cssLink)
        readingItemFrame.staticLayout({
          width: contentWidth,
          height: contentHeight
        })
        if (blankPagePosition === `before`) {
          if (context.isRTL()) {
            frameElement?.style.setProperty(`margin-right`, `${pageWidth}px`)
          } else {
            frameElement?.style.setProperty(`margin-left`, `${pageWidth}px`)
          }
        } else {
          frameElement?.style.removeProperty(`margin-left`)
          frameElement?.style.removeProperty(`margin-right`)
        }
      }

      // commonReadingItem.layout({ width: minimumWidth, height: contentHeight, minimumWidth, blankPagePosition })
      commonReadingItem.layout({ width: minimumWidth, height: contentHeight })

      return { width: minimumWidth, height: contentHeight }
    } else {
      // commonReadingItem.layout({ width: minimumWidth, height: pageHeight, minimumWidth, blankPagePosition })
      commonReadingItem.layout({ width: minimumWidth, height: pageHeight })
    }

    return { width: minimumWidth, height: pageHeight }
  }

  const layout = (layoutInformation: { blankPagePosition: `before` | `after` | `none`, minimumWidth: number, spreadPosition: `none` | `left` | `right` }) => {
    return applySize(layoutInformation)
  }

  const destroy = () => {
    commonReadingItem.destroy()
  }

  return {
    ...commonReadingItem,
    layout,
    destroy
  }
}

const buildDocumentStyle = ({ columnWidth, enableTouch, spreadPosition }: {
  columnWidth: number,
  columnHeight: number,
  horizontalMargin: number,
  enableTouch: boolean,
  spreadPosition: `none` | `left` | `right`
}, viewportDimensions: { height: number, width: number } | undefined) => {
  return `
    body {
      
    }
    body {
      margin: 0;
      ${!viewportDimensions
? `
        display: flex;
        justify-content: ${spreadPosition === `left` ? `flex-end` : spreadPosition === `right` ? `flex-start` : `center`};
      `
: ``}
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
     * It needs to be disabled when using free scroll
     */
    ``}
    html, body {
      ${enableTouch
? `
        touch-action: none
      `
: ``}
    }
    ${/*
      prevent drag of image instead of touch on firefox
    */``}
    img {
      user-select: none;
      -webkit-user-drag: none;
      -khtml-user-drag: none;
      -moz-user-drag: none;
      -o-user-drag: none;
      user-drag: none;
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
      ${!viewportDimensions
? `
        -width: 100%;
        max-width: 100%;
        height:100%;
        object-fit:contain;
      `
: ``}
    }
  `
}
