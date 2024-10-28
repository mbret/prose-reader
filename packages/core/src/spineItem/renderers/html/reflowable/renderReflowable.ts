import { Manifest } from "@prose-reader/shared"
import { FrameItem } from "../FrameItem"
import { upsertCSS } from "../../../../utils/frames"
import {
  buildStyleForReflowableImageOnly,
  buildStyleForViewportFrame,
  buildStyleWithMultiColumn,
} from "./styles"
import { getViewPortInformation } from "../prePaginated/renderPrePaginated"

const getDimensionsForReflowableContent = ({
  isUsingVerticalWriting,
  minimumWidth,
  pageHeight,
  pageWidth,
}: {
  isUsingVerticalWriting: boolean
  minimumWidth: number
  pageWidth: number
  pageHeight: number
}) => {
  const horizontalMargin = 0
  const verticalMargin = 0
  let columnWidth = pageWidth - horizontalMargin * 2
  const columnHeight = pageHeight - verticalMargin * 2
  let width = pageWidth - horizontalMargin * 2

  if (isUsingVerticalWriting) {
    width = minimumWidth - horizontalMargin * 2
    columnWidth = columnHeight
  }

  return {
    columnHeight,
    columnWidth,
    width,
  }
}

export const renderReflowable = ({
  pageHeight: pageSizeHeight,
  pageWidth,
  frameItem,
  manifest,
  latestContentHeightWhenLoaded,
  minPageSpread,
  isRTL,
  blankPagePosition,
  isImageType,
  enableTouch,
}: {
  blankPagePosition: `before` | `after` | `none`
  pageWidth: number
  pageHeight: number
  frameItem: FrameItem
  manifest?: Manifest
  minPageSpread: number
  latestContentHeightWhenLoaded: number | undefined
  isRTL: boolean
  isImageType: boolean
  enableTouch: boolean
}) => {
  const minimumWidth = minPageSpread * pageWidth
  let newLatestContentHeightWhenLoaded = latestContentHeightWhenLoaded
  const continuousScrollableReflowableItem =
    manifest?.renditionLayout === "reflowable" &&
    manifest?.renditionFlow === "scrolled-continuous"
  const frameElement = frameItem.loader.element

  /**
   * In case of reflowable with continous scrolling, we don't know if the content is
   * bigger or smaller than the page size, therefore we find a middle ground to have
   * a pre-load page that is not too big nor too small to prevent weird jumping
   * once the frame load.
   *
   * We also use a minimum height still becaues we don't want all of the items to
   * preload since they would be in the current viewport.
   *
   * @todo make it a setting
   */
  const pageHeight = continuousScrollableReflowableItem
    ? Math.min(400, pageSizeHeight)
    : pageSizeHeight

  // reset width of iframe to be able to retrieve real size later
  frameElement?.style.setProperty(`width`, `${pageWidth}px`)

  /**
   * In case of reflowable with continous scrolling, we let the frame takes whatever height
   * it needs since it could be less or more than page size and we want a continous reading
   */
  if (!continuousScrollableReflowableItem) {
    frameElement?.style.setProperty(`height`, `${pageHeight}px`)
  }

  const { viewportDimensions, computedScale = 1 } =
    getViewPortInformation({
      frameItem,
      pageHeight,
      pageWidth,
    }) ?? {}
  const isGloballyPrePaginated = manifest?.renditionLayout === `pre-paginated`

  // @todo simplify ? should be from common spine item
  if (
    frameItem.isLoaded &&
    frameElement?.contentDocument &&
    frameElement?.contentWindow
  ) {
    let contentWidth = pageWidth
    let contentHeight = pageHeight

    frameElement?.style.setProperty(`visibility`, `visible`)
    frameElement?.style.setProperty(`opacity`, `1`)

    if (viewportDimensions?.hasViewport) {
      upsertCSS(
        frameElement,
        `prose-reader-html-renderer-framce-css`,
        buildStyleForViewportFrame(),
      )

      frameItem.staticLayout({
        width: viewportDimensions.width ?? 1,
        height: viewportDimensions.height ?? 1,
      })

      frameElement?.style.setProperty(`position`, `absolute`)
      frameElement?.style.setProperty(`top`, `50%`)
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

      frameElement?.style.setProperty(
        `transform`,
        `translate(-50%, -50%) scale(${computedScale})`,
      )
      frameElement?.style.setProperty(`transform-origin`, `center center`)
    } else {
      const frameStyle = isImageType
        ? buildStyleForReflowableImageOnly({
            isScrollable: manifest?.renditionFlow === `scrolled-continuous`,
            enableTouch,
          })
        : buildStyleWithMultiColumn(
            getDimensionsForReflowableContent({
              isUsingVerticalWriting: frameItem.isUsingVerticalWriting(),
              minimumWidth,
              pageHeight,
              pageWidth,
            }),
          )

      upsertCSS(frameElement, `prose-reader-css`, frameStyle, true)

      if (frameItem.isUsingVerticalWriting()) {
        const pages = Math.ceil(
          frameElement.contentDocument.documentElement.scrollHeight /
            pageHeight,
        )
        contentHeight = pages * pageHeight

        frameItem.staticLayout({
          width: minimumWidth,
          height: contentHeight,
        })
      } else if (manifest?.renditionFlow === `scrolled-continuous`) {
        /**
         * We take body content here because the frame body might be smaller after
         * layout due to possible image content and image ratio. We need to be able
         * to retrieve the actual real body height. The window height is probably the same
         * as the current frame set height which may be wrong after resize.
         */
        contentHeight = frameElement.contentDocument.body.scrollHeight
        newLatestContentHeightWhenLoaded = contentHeight

        frameItem.staticLayout({
          width: minimumWidth,
          height: contentHeight,
        })
      } else {
        const pages = Math.ceil(
          frameElement.contentDocument.documentElement.scrollWidth / pageWidth,
        )
        /**
         * It is possible that a pre-paginated epub has reflowable item inside it. This is weird because
         * the spec says that we should use pre-paginated for each spine item. Could be a publisher mistake, in
         * any case we follow the spec and enforce the iframe to be contained within page width.
         * If we don't respect the spec we end up with dynamic pagination for a fixed document, which can update
         * the correct number of pages when item is loaded/unload. Bringing weird user experience.
         * The publisher should use global reflowable with pre-paginated content instead.
         */
        if (isGloballyPrePaginated) {
          contentWidth = pageWidth
        } else {
          contentWidth = pages * pageWidth
        }

        frameItem.staticLayout({
          width: contentWidth,
          height: contentHeight,
        })
      }
    }

    const isFillingAllScreen = contentWidth % minimumWidth === 0

    // when a reflow iframe does not fill the entire screen (when spread) we will
    // enlarge the container to make sure no other reflow item starts on the same screen
    if (!isFillingAllScreen) {
      contentWidth = contentWidth + pageWidth
      if (isRTL && !frameItem.isUsingVerticalWriting()) {
        frameElement?.style.setProperty(`margin-left`, `${pageWidth}px`)
      }
    } else {
      frameElement?.style.setProperty(`margin-left`, `0px`)
    }

    return { width: contentWidth, height: contentHeight }
  }

  const height = newLatestContentHeightWhenLoaded || pageHeight

  return {
    width: minimumWidth,
    height,
    latestContentHeightWhenLoaded: newLatestContentHeightWhenLoaded,
  }
}
