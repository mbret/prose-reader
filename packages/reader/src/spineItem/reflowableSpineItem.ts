import { BehaviorSubject, Observable } from "rxjs"
import { Context } from "../context"
import { Manifest } from "../types"
import { Hook } from "../types/Hook"
import { createCommonSpineItem } from "./commonSpineItem"

export const createReflowableSpineItem = ({ item, context, containerElement, iframeEventBridgeElement, hooks$, viewportState$ }: {
  item: Manifest[`spineItems`][number],
  containerElement: HTMLElement,
  iframeEventBridgeElement: HTMLElement,
  context: Context,
  hooks$: BehaviorSubject<Hook[]>,
  viewportState$: Observable<`free` | `busy`>
}) => {
  const commonSpineItem = createCommonSpineItem({ context, item, parentElement: containerElement, iframeEventBridgeElement, hooks$, viewportState$ })
  const spineItemFrame = commonSpineItem.spineItemFrame
  /**
   * This value is being used to avoid item to shrink back to smaller size when getting a layout after
   * the content has been loaded.
   * This means when previous content get unload, the user does not end up farther than he should be due to previous content
   * shrinking.
   *
   * @important
   * For now it's only used for continuous-scroll as experimental test. This could potentially solve the sliding
   * issue with reflow content as wel.
   */
  let latestContentHeightWhenLoaded: number | undefined
  const isImageType = () => item.mediaType?.startsWith(`image/`)

  const getDimensions = (isUsingVerticalWriting: boolean, minimumWidth: number) => {
    const pageSize = context.getPageSize()
    const horizontalMargin = context.getHorizontalMargin()
    let columnWidth = pageSize.width - (horizontalMargin * 2)
    const columnHeight = pageSize.height - (horizontalMargin * 2)
    let width = pageSize.width - (horizontalMargin * 2)

    if (isUsingVerticalWriting) {
      width = minimumWidth - (horizontalMargin * 2)
      columnWidth = columnHeight
    }

    return {
      columnHeight,
      columnWidth,
      horizontalMargin,
      width
    }
  }

  const applySize = ({ minimumWidth, blankPagePosition }: { blankPagePosition: `before` | `after` | `none`, minimumWidth: number }) => {
    const { width: pageWidth, height: pageHeight } = context.getPageSize()
    const viewportDimensions = spineItemFrame.getViewportDimensions()
    const visibleArea = context.getVisibleAreaRect()
    const frameElement = spineItemFrame.getManipulableFrame()?.frame
    const isGloballyPrePaginated = context.getManifest()?.renditionLayout === `pre-paginated`

    if (spineItemFrame?.getIsLoaded() && frameElement?.contentDocument && frameElement?.contentWindow) {
      let contentWidth = pageWidth
      let contentHeight = visibleArea.height + context.getCalculatedInnerMargin()

      frameElement?.style.setProperty(`visibility`, `visible`)
      frameElement?.style.setProperty(`opacity`, `1`)

      if (viewportDimensions) {
        const computedScale = Math.min(pageWidth / viewportDimensions.width, pageHeight / viewportDimensions.height)
        commonSpineItem.injectStyle(spineItemFrame, buildStyleForFakePrePaginated())
        spineItemFrame.staticLayout({
          width: viewportDimensions.width,
          height: viewportDimensions.height
        })
        frameElement?.style.setProperty(`--scale`, `${computedScale}`)
        frameElement?.style.setProperty(`position`, `absolute`)
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
        const frameStyle = isImageType()
          ? buildStyleForReflowableImageOnly({
            isScrollable: context.getManifest()?.renditionFlow === `scrolled-continuous`,
            enableTouch: context.getSettings().computedPageTurnMode !== `scrollable`
          })
          : buildStyleWithMultiColumn(getDimensions(spineItemFrame.isUsingVerticalWriting(), minimumWidth))

        commonSpineItem.injectStyle(spineItemFrame, frameStyle)

        if (spineItemFrame.isUsingVerticalWriting()) {
          const pages = Math.ceil(
            frameElement.contentDocument.documentElement.scrollHeight / pageHeight
          )
          contentHeight = pages * pageHeight

          spineItemFrame.staticLayout({
            width: minimumWidth,
            height: contentHeight
          })
        } else if (context.getManifest()?.renditionFlow === `scrolled-continuous`) {
          contentHeight = frameElement.contentDocument.documentElement.scrollHeight
          latestContentHeightWhenLoaded = contentHeight

          spineItemFrame.staticLayout({
            width: minimumWidth,
            height: contentHeight
          })
        } else {
          const pages = Math.ceil(
            frameElement.contentDocument.documentElement.scrollWidth / pageWidth
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

          spineItemFrame.staticLayout({
            width: contentWidth,
            height: contentHeight
          })
        }
      }

      const isFillingAllScreen = contentWidth % minimumWidth === 0

      // when a reflow iframe does not fill the entire screen (when spread) we will
      // enlarge the container to make sure no other reflow item starts on the same screen
      if (!isFillingAllScreen) {
        contentWidth = contentWidth + pageWidth
        if (context.isRTL() && !commonSpineItem.isUsingVerticalWriting()) {
          frameElement?.style.setProperty(`margin-left`, `${pageWidth}px`)
        }
      } else {
        frameElement?.style.setProperty(`margin-left`, `0px`)
      }

      commonSpineItem.layout({ width: contentWidth, height: contentHeight })

      return { width: contentWidth, height: contentHeight }
    }

    const height = latestContentHeightWhenLoaded || pageHeight

    commonSpineItem.layout({ width: minimumWidth, height })

    return { width: minimumWidth, height }
  }

  const layout = (layoutInformation: { blankPagePosition: `before` | `after` | `none`, minimumWidth: number }) => {
    const { width: pageWidth, height: pageHeight } = context.getPageSize()
    // reset width of iframe to be able to retrieve real size later
    spineItemFrame.getManipulableFrame()?.frame?.style.setProperty(`width`, `${pageWidth}px`)
    spineItemFrame.getManipulableFrame()?.frame?.style.setProperty(`height`, `${pageHeight}px`)

    return applySize(layoutInformation)
  }

  return {
    ...commonSpineItem,
    isReflowable: true,
    layout
  }
}

/**
 * Item is:
 * - anything that contains a defined width/height viewport
 *
 * In this case we respect the viewport, scale it and act as pre-paginated
 */
const buildStyleForFakePrePaginated = () => {
  return `
    html {
      width: 100%;
      height: 100%;
    }
    body {
      width: 100%;
      height: 100%;
      margin: 0;
    }
    ${
    /*
     * @see https://hammerjs.github.io/touch-action/
     */
    ``}
    html, body {
      touch-action: none;
    }
    img {
      display: flex;
      max-width: 100%;
      max-height: 100%;
      margin: 0 auto;
    }
  `
}

/**
 * Item is:
 * - not pre-paginated (we would not be in this item otherwise)
 * - jpg, png, etc
 *
 * It does not means it has to be pre-paginated (scrollable for example)
 */
const buildStyleForReflowableImageOnly = ({ isScrollable, enableTouch }: { enableTouch: boolean, isScrollable: boolean }) => {
  return `
    html {
    }
    body {
    }
    ${
    /*
     * @see https://hammerjs.github.io/touch-action/
     */
    ``}
    html, body {
      width: 100%;
      margin: 0;
      padding: 0;
      ${enableTouch
      ? `
        touch-action: none
      `
      : ``}
    }
    ${isScrollable
      ? `
      img {
        height: auto !important;
        margin: 0;
        padding: 0;
        box-sizing: border-box;
        ${
      /**
       * line break issue
       * @see https://stackoverflow.com/questions/37869020/image-not-taking-up-the-full-height-of-container
       */
      ``}
        display: block;
      }
    `
      : ``}
  `
}

/**
 * Item is:
 * - regular html document
 * - does not contain defined width/height viewport
 *
 * We use css multi column to paginate it
 */
const buildStyleWithMultiColumn = ({ width, columnHeight, columnWidth, horizontalMargin }: {
  width: number,
  columnWidth: number,
  columnHeight: number,
  horizontalMargin: number,
  // verticalMargin: number
}) => {
  return `
    parsererror {
      display: none !important;
    }
    ${/*
      might be html * but it does mess up things like figure if so.
      check accessible_epub_3
    */``}
    html, body {
      margin: 0;
      padding: 0 !important;
      -max-width: ${columnWidth}px !important;
    }
    ${/*
      body {
        height: ${columnHeight}px !important;
        width: ${columnWidth}px !important;
      }
    */``}
    body {
      padding: 0 !important;
      width: ${width}px !important;
      height: ${columnHeight}px !important;
      -margin-left: ${horizontalMargin}px !important;
      -margin-right: ${horizontalMargin}px !important;
      margin: ${horizontalMargin}px ${horizontalMargin}px !important;
      -padding-top: ${horizontalMargin}px !important;
      -padding-bottom: ${horizontalMargin}px !important;
      overflow-y: hidden;
      column-width: ${columnWidth}px !important;
      column-gap: ${horizontalMargin * 2}px !important;
      column-fill: auto !important;
      word-wrap: break-word;
      box-sizing: border-box;
    }
    body {
      margin: 0;
    }
    body:focus-visible {
      ${/*
        we make sure that there are no outline when we focus something inside the iframe
      */``}
      outline: none;
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
      this messes up hard, be careful with this
    */``}
    * {
      -max-width: ${columnWidth}px !important;
    }
    ${/*
      this is necessary to have a proper calculation when determining size
      of iframe content. If an img is using something like width:100% it would expand to
      the size of the original image and potentially gives back a wrong size (much larger)
      @see https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_Columns/Handling_Overflow_in_Multicol
    */``}
    img, video, audio, object, svg {
      max-width: 100%;
      max-width: ${columnWidth}px !important;
      max-height: ${columnHeight}px !important;
      -pointer-events: none;
      -webkit-column-break-inside: avoid;
      page-break-inside: avoid;
      break-inside: avoid;
    }
    figure {
      d-max-width: ${columnWidth}px !important;
    }
    img {
      object-fit: contain;
      break-inside: avoid;
      box-sizing: border-box;
      d-max-width: ${columnWidth}px !important;
    }
    ${/*
      img, video, audio, object, svg {
        max-height: ${columnHeight}px !important;
        box-sizing: border-box;
        object-fit: contain;
        -webkit-column-break-inside: avoid;
        page-break-inside: avoid;
        break-inside: avoid;
      }
    */``}
    table {
      max-width: ${columnWidth}px !important;
      table-layout: fixed;
    }
    td {
      max-width: ${columnWidth}px;
    }
  `
}