import { upsertCSS } from "../../../../utils/frames"
import { FrameItem } from "../FrameItem"

export const getStyleForViewportDocument = () => {
  return `
    body {
        margin: 0;
        }
      }
    `
}

export const getViewPortInformation = ({
  pageHeight,
  pageWidth,
  frameItem,
}: {
  pageWidth: number
  pageHeight: number
  frameItem: FrameItem
}) => {
  const viewportDimensions = frameItem.getViewportDimensions()
  const frameElement = frameItem.element

  if (
    frameElement?.contentDocument &&
    frameElement.contentWindow &&
    viewportDimensions
  ) {
    const computedWidthScale = pageWidth / viewportDimensions.width
    const computedScale = Math.min(
      computedWidthScale,
      pageHeight / viewportDimensions.height,
    )

    return { computedScale, computedWidthScale, viewportDimensions }
  }
}

const buildDocumentStyle = (
  {
    columnWidth,
    enableTouch,
    spreadPosition,
  }: {
    columnWidth: number
    columnHeight: number
    enableTouch: boolean
    spreadPosition: `none` | `left` | `right`
  },
  viewportDimensions: { height: number; width: number } | undefined,
) => {
  return `
      ${getStyleForViewportDocument()}
      body {
        ${
          !viewportDimensions
            ? `
          display: flex;
          justify-content: ${spreadPosition === `left` ? `flex-end` : spreadPosition === `right` ? `flex-start` : `center`};
        `
            : ``
        }
      }
      ${
        /*
        might be html * but it does mess up things like figure if so.
        check accessible_epub_3
      */ ``
      }
      html, body {
        height: 100%;
        width: 100%;
      }
      ${
        /*
        This one is important for preventing 100% img to resize above
        current width. Especially needed for cbz conversion
      */ ``
      }
      html, body {
        -max-width: ${columnWidth}px !important;
      }
      ${
        /*
         * @see https://hammerjs.github.io/touch-action/
         * It needs to be disabled when using free scroll
         */
        ``
      }
      html, body {
        ${
          enableTouch
            ? `
          touch-action: none
        `
            : ``
        }
      }
      ${
        /*
        prevent drag of image instead of touch on firefox
      */ ``
      }
      img {
        user-select: none;
        -webkit-user-drag: none;
        -khtml-user-drag: none;
        -moz-user-drag: none;
        -o-user-drag: none;
        user-drag: none;
        ${
          /*
          prevent weird overflow or margin. Try `block` if `flex` has weird behavior
        */ ``
        }
        display: flex;
        ${
          /*
          If the document does not have viewport, we cannot scale anything inside.
          This should never happens with a valid epub document however it will happens if
          we load .jpg, .png, etc directly in the iframe. This is expected, in this case we force
          the inner content to display correctly.
        */ ``
        }
        ${
          !viewportDimensions
            ? `
          -width: 100%;
          max-width: 100%;
          height:100%;
          object-fit:contain;
        `
            : ``
        }
      }
    `
}

const getDimensionsForPaginatedContent = ({
  pageHeight: columnHeight,
  pageWidth,
}: {
  pageWidth: number
  pageHeight: number
}) => {
  const columnWidth = pageWidth

  return { columnHeight, columnWidth }
}

export const renderPrePaginated = ({
  minPageSpread,
  blankPagePosition,
  spreadPosition,
  pageHeight,
  pageWidth,
  frameItem,
  isRTL,
  enableTouch,
}: {
  minPageSpread: number
  blankPagePosition: `before` | `after` | `none`
  spreadPosition: `none` | `left` | `right`
  pageWidth: number
  pageHeight: number
  frameItem: FrameItem
  isRTL: boolean
  enableTouch: boolean
}) => {
  const { viewportDimensions, computedScale = 1 } =
    getViewPortInformation({ frameItem, pageHeight, pageWidth }) ?? {}
  const frameElement = frameItem.element
  const minimumWidth = minPageSpread * pageWidth

  console.log({
    minPageSpread,
    blankPagePosition,
    spreadPosition,
    minimumWidth,
    frameElement,
  })

  if (
    frameItem?.isLoaded &&
    frameElement?.contentDocument &&
    frameElement?.contentWindow
  ) {
    const contentWidth = pageWidth
    const contentHeight = pageHeight

    const cssLink = buildDocumentStyle(
      {
        ...getDimensionsForPaginatedContent({ pageHeight, pageWidth }),
        enableTouch,
        spreadPosition,
      },
      viewportDimensions,
    )

    frameElement?.style.setProperty(`visibility`, `visible`)
    frameElement?.style.setProperty(`opacity`, `1`)

    upsertCSS(frameElement, `prose-reader-css`, cssLink)

    if (viewportDimensions) {
      frameItem.staticLayout({
        width: viewportDimensions.width,
        height: viewportDimensions.height,
      })
    } else {
      frameItem.staticLayout({
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
