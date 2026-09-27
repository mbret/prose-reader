import type { Manifest } from "@prose-reader/shared"
import { setStylePropertyIfChanged } from "../../../../utils/dom"
import { upsertCSSToFrame } from "../../../../utils/frames"
import { getViewPortInformation } from "../viewport"
import {
  buildStyleForReflowableImageOnly,
  buildStyleForViewportFrame,
  buildStyleWithMultiColumn,
  buildStyleWithOneColumn,
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
  setStylePropertyIfChanged(frameElement.style, `width`, `${size.width}px`)
  setStylePropertyIfChanged(frameElement.style, `height`, `${size.height}px`)
}

export const renderReflowable = ({
  pageHeight,
  pageWidth,
  frameElement,
  manifest,
  isLaidOutAsOneColumn,
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
  manifest: Manifest
  /**
   * Read by scrolling: one column as tall as its content, rather than
   * paginated.
   */
  isLaidOutAsOneColumn: boolean
  minPageSpread: number
  isRTL: boolean
  isImageType: boolean
  enableTouch: boolean
  isUsingVerticalWriting: boolean
}) => {
  const minimumWidth = minPageSpread * pageWidth

  // reset width of iframe to be able to retrieve real size later
  setStylePropertyIfChanged(frameElement.style, `width`, `${pageWidth}px`)

  /**
   * A document laid out as one column takes the height of its content, which
   * can be less or more than a page. It is measured in a frame with no height,
   * rather than the browser's default one or whatever the host's CSS gives an
   * iframe: the height of its scrolling element is at least the frame's.
   */
  if (isLaidOutAsOneColumn) {
    setStylePropertyIfChanged(frameElement.style, `height`, `0px`)
  } else {
    setStylePropertyIfChanged(frameElement.style, `height`, `${pageHeight}px`)
  }

  const { viewportDimensions, computedScale = 1 } =
    getViewPortInformation({
      frameElement,
      pageHeight,
      pageWidth,
    }) ?? {}
  const isGloballyPrePaginated = manifest.renditionLayout === `pre-paginated`

  // @todo simplify ? should be from common spine item
  if (
    frameElement?.contentDocument &&
    frameElement?.contentWindow &&
    frameElement.contentDocument.body
  ) {
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

      setStylePropertyIfChanged(frameElement.style, `position`, `absolute`)
      setStylePropertyIfChanged(frameElement.style, `top`, `50%`)
      setStylePropertyIfChanged(
        frameElement.style,
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

      setStylePropertyIfChanged(
        frameElement.style,
        `transform`,
        `translate(-50%, -50%) scale(${computedScale})`,
      )
      setStylePropertyIfChanged(
        frameElement.style,
        `transform-origin`,
        `center center`,
      )
    } else {
      const frameStyle = isImageType
        ? buildStyleForReflowableImageOnly({
            isScrollable: isLaidOutAsOneColumn,
            enableTouch,
          })
        : isLaidOutAsOneColumn
          ? buildStyleWithOneColumn()
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
      } else if (isLaidOutAsOneColumn) {
        /**
         * The height of everything the document shows, its margins and those
         * of its content included: that of its scrolling element, the root in
         * standards mode and the body in quirks mode, where the page generated
         * for an image is. The frame has no height at this point, so it is the
         * content's.
         */
        const { scrollingElement, documentElement } =
          frameElement.contentDocument

        contentWidth = minimumWidth
        contentHeight = (scrollingElement ?? documentElement).scrollHeight

        staticLayout(frameElement, {
          width: contentWidth,
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
        setStylePropertyIfChanged(
          frameElement.style,
          `margin-left`,
          `${pageWidth}px`,
        )
      }
    } else {
      setStylePropertyIfChanged(frameElement.style, `margin-left`, `0px`)
    }

    return { width: contentWidth, height: contentHeight }
  }

  return undefined
}
