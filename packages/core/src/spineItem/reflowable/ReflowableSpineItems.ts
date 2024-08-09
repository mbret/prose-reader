import { Context } from "../../context/Context"
import { Manifest } from "../.."
import { createCommonSpineItem } from "../commonSpineItem"
import { ReaderSettingsManager } from "../../settings/ReaderSettingsManager"
import { HookManager } from "../../hooks/HookManager"
import {
  buildStyleForViewportFrame,
  buildStyleForReflowableImageOnly,
  buildStyleWithMultiColumn,
} from "./styles"

export const createReflowableSpineItem = ({
  item,
  context,
  containerElement,
  settings,
  hookManager,
  index
}: {
  item: Manifest[`spineItems`][number]
  containerElement: HTMLElement
  context: Context
  settings: ReaderSettingsManager
  hookManager: HookManager
  index: number
}) => {
  const commonSpineItem = createCommonSpineItem({
    context,
    item,
    parentElement: containerElement,
    settings,
    hookManager,
    index
  })
  const spineItemFrame = commonSpineItem.frame
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

  const layout = ({
    blankPagePosition,
    minimumWidth,
  }: {
    blankPagePosition: `before` | `after` | `none`
    minimumWidth: number
  }) => {
    const { width: pageWidth, height: pageHeight } = context.getPageSize()
    // reset width of iframe to be able to retrieve real size later
    spineItemFrame
      .getManipulableFrame()
      ?.frame?.style.setProperty(`width`, `${pageWidth}px`)
    spineItemFrame
      .getManipulableFrame()
      ?.frame?.style.setProperty(`height`, `${pageHeight}px`)

    const { viewportDimensions, computedScale = 1 } =
      commonSpineItem.getViewPortInformation() ?? {}
    const visibleArea = context.state.visibleAreaRect
    const frameElement = spineItemFrame.getManipulableFrame()?.frame
    const isGloballyPrePaginated =
      context.manifest?.renditionLayout === `pre-paginated`

    // @todo simplify ? should be from common spine item
    if (
      spineItemFrame?.getIsLoaded() &&
      frameElement?.contentDocument &&
      frameElement?.contentWindow
    ) {
      let contentWidth = pageWidth
      let contentHeight =
        visibleArea.height + context.state.calculatedInnerMargin

      frameElement?.style.setProperty(`visibility`, `visible`)
      frameElement?.style.setProperty(`opacity`, `1`)

      if (viewportDimensions) {
        commonSpineItem.injectStyle(buildStyleForViewportFrame())

        commonSpineItem.executeOnLayoutBeforeMeasurementHook({ minimumWidth })

        spineItemFrame.staticLayout({
          width: viewportDimensions.width,
          height: viewportDimensions.height,
        })
        frameElement?.style.setProperty(`position`, `absolute`)
        frameElement?.style.setProperty(`top`, `50%`)
        frameElement?.style.setProperty(
          `left`,
          blankPagePosition === `before`
            ? context.isRTL()
              ? `25%`
              : `75%`
            : blankPagePosition === `after`
              ? context.isRTL()
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
        const frameStyle = commonSpineItem.isImageType()
          ? buildStyleForReflowableImageOnly({
              isScrollable:
                context.manifest?.renditionFlow === `scrolled-continuous`,
              enableTouch:
                settings.settings.computedPageTurnMode !== `scrollable`,
            })
          : buildStyleWithMultiColumn(
              commonSpineItem.getDimensionsForReflowableContent(
                spineItemFrame.isUsingVerticalWriting(),
                minimumWidth,
              ),
            )

        commonSpineItem.injectStyle(frameStyle)

        commonSpineItem.executeOnLayoutBeforeMeasurementHook({ minimumWidth })

        if (spineItemFrame.isUsingVerticalWriting()) {
          const pages = Math.ceil(
            frameElement.contentDocument.documentElement.scrollHeight /
              pageHeight,
          )
          contentHeight = pages * pageHeight

          spineItemFrame.staticLayout({
            width: minimumWidth,
            height: contentHeight,
          })
        } else if (context.manifest?.renditionFlow === `scrolled-continuous`) {
          contentHeight =
            frameElement.contentDocument.documentElement.scrollHeight
          latestContentHeightWhenLoaded = contentHeight

          spineItemFrame.staticLayout({
            width: minimumWidth,
            height: contentHeight,
          })
        } else {
          const pages = Math.ceil(
            frameElement.contentDocument.documentElement.scrollWidth /
              pageWidth,
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
            height: contentHeight,
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

      commonSpineItem.layout({
        width: contentWidth,
        height: contentHeight,
        blankPagePosition,
        minimumWidth,
      })

      return { width: contentWidth, height: contentHeight }
    } else {
      commonSpineItem.executeOnLayoutBeforeMeasurementHook({ minimumWidth })
    }

    const height = latestContentHeightWhenLoaded || pageHeight

    commonSpineItem.layout({
      width: minimumWidth,
      height,
      blankPagePosition,
      minimumWidth,
    })

    return { width: minimumWidth, height }
  }

  return {
    ...commonSpineItem,
    layout,
  }
}
