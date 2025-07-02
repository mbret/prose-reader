import type { Manifest } from "@prose-reader/shared"
import { upsertCSSToFrame } from "../../../../utils/frames"
import { getViewPortInformation } from "../prePaginated/renderPrePaginated"
import {
  buildStyleForReflowableImageOnly,
  buildStyleForViewportFrame,
  buildStyleWithMultiColumn,
} from "./styles"

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

export const renderReflowable = ({
  pageHeight: pageSizeHeight,
  pageWidth,
  frameElement,
  manifest,
  minPageSpread,
  isRTL,
  blankPagePosition,
  isImageType,
  enableTouch,
  isUsingVerticalWriting,
}: {
  blankPagePosition: `before` | `after` | `none`
  pageWidth: number
  pageHeight: number
  frameElement: HTMLIFrameElement
  manifest?: Manifest
  minPageSpread: number
  isRTL: boolean
  isImageType: boolean
  enableTouch: boolean
  isUsingVerticalWriting: boolean
}) => {
  const minimumWidth = minPageSpread * pageWidth
  const continuousScrollableReflowableItem =
    manifest?.renditionLayout === "reflowable" &&
    manifest?.renditionFlow === "scrolled-continuous"

  /**
   * In case of reflowable with continuous scrolling, we don't know if the content is
   * bigger or smaller than the page size, therefore we find a middle ground to have
   * a pre-load page that is not too big nor too small to prevent weird jumping
   * once the frame load.
   *
   * We also use a minimum height still because we don't want all of the items to
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
   * In case of reflowable with continuous scrolling, we let the frame takes whatever height
   * it needs since it could be less or more than page size and we want a continuous reading
   */
  if (!continuousScrollableReflowableItem) {
    frameElement?.style.setProperty(`height`, `${pageHeight}px`)
  } else {
    frameElement?.style.removeProperty(`height`)
  }

  const { viewportDimensions, computedScale = 1 } =
    getViewPortInformation({
      frameElement,
      pageHeight,
      pageWidth,
    }) ?? {}
  const isGloballyPrePaginated = manifest?.renditionLayout === `pre-paginated`

  // @todo simplify ? should be from common spine item
  if (frameElement?.contentDocument && frameElement?.contentWindow) {
    let contentWidth = pageWidth
    let contentHeight = pageHeight

    if (viewportDimensions?.hasViewport) {
      upsertCSSToFrame(
        frameElement,
        `prose-reader-html-renderer-framce-css`,
        buildStyleForViewportFrame(),
      )

      staticLayout(frameElement, {
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
              isUsingVerticalWriting: isUsingVerticalWriting,
              minimumWidth,
              pageHeight,
              pageWidth,
            }),
          )

      upsertCSSToFrame(frameElement, `prose-reader-css`, frameStyle, true)

      if (isUsingVerticalWriting) {
        const pages = Math.ceil(
          frameElement.contentDocument.documentElement.scrollHeight /
            pageHeight,
        )
        contentHeight = pages * pageHeight

        staticLayout(frameElement, {
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

        staticLayout(frameElement, {
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

        staticLayout(frameElement, {
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
      if (isRTL && !isUsingVerticalWriting) {
        frameElement?.style.setProperty(`margin-left`, `${pageWidth}px`)
      }
    } else {
      frameElement?.style.setProperty(`margin-left`, `0px`)
    }

    return { width: contentWidth, height: contentHeight }
  }

  return undefined
}
