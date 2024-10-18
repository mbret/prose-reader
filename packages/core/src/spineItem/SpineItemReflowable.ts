import { Context } from "../context/Context"
import { Manifest } from ".."
import { SpineItem } from "./SpineItem"
import { ReaderSettingsManager } from "../settings/ReaderSettingsManager"
import { HookManager } from "../hooks/HookManager"
import {
  buildStyleForViewportFrame,
  buildStyleForReflowableImageOnly,
  buildStyleWithMultiColumn,
} from "./reflowable/styles"

export class SpineItemReflowable extends SpineItem {
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
  latestContentHeightWhenLoaded: number | undefined

  constructor(
    item: Manifest[`spineItems`][number],
    containerElement: HTMLElement,
    context: Context,
    settings: ReaderSettingsManager,
    hookManager: HookManager,
    index: number,
  ) {
    super(item, containerElement, context, settings, hookManager, index)
  }

  layout = ({
    blankPagePosition,
    minimumWidth,
  }: {
    blankPagePosition: `before` | `after` | `none`
    minimumWidth: number
  }) => {
    const { width: pageWidth, height: pageSizeHeight } =
      this.context.getPageSize()

    const continuousScrollableReflowableItem =
      this.context.manifest?.renditionLayout === "reflowable" &&
      this.context.manifest?.renditionFlow === "scrolled-continuous" &&
      this.item.renditionLayout === "reflowable"

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
    this.renderer.element?.style.setProperty(`width`, `${pageWidth}px`)

    /**
     * In case of reflowable with continous scrolling, we let the frame takes whatever height
     * it needs since it could be less or more than page size and we want a continous reading
     */
    if (!continuousScrollableReflowableItem) {
      this.renderer.element?.style.setProperty(`height`, `${pageHeight}px`)
    }

    const { viewportDimensions, computedScale = 1 } =
      this.getViewPortInformation() ?? {}
    const visibleArea = this.context.state.visibleAreaRect
    const frameElement = this.renderer.element
    const isGloballyPrePaginated =
      this.context.manifest?.renditionLayout === `pre-paginated`

    // @todo simplify ? should be from common spine item
    if (
      this.renderer?.frameItem.isLoaded &&
      frameElement?.contentDocument &&
      frameElement?.contentWindow
    ) {
      let contentWidth = pageWidth
      let contentHeight =
        visibleArea.height + this.context.state.calculatedInnerMargin

      frameElement?.style.setProperty(`visibility`, `visible`)
      frameElement?.style.setProperty(`opacity`, `1`)

      if (viewportDimensions) {
        this.upsertCSS(`prose-reader-css`, buildStyleForViewportFrame())

        this.executeOnLayoutBeforeMeasurementHook({ minimumWidth })

        this.renderer.frameItem.staticLayout({
          width: viewportDimensions.width,
          height: viewportDimensions.height,
        })
        frameElement?.style.setProperty(`position`, `absolute`)
        frameElement?.style.setProperty(`top`, `50%`)
        frameElement?.style.setProperty(
          `left`,
          blankPagePosition === `before`
            ? this.context.isRTL()
              ? `25%`
              : `75%`
            : blankPagePosition === `after`
              ? this.context.isRTL()
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
        const frameStyle = this.isImageType()
          ? buildStyleForReflowableImageOnly({
              isScrollable:
                this.context.manifest?.renditionFlow === `scrolled-continuous`,
              enableTouch:
                this.settings.values.computedPageTurnMode !== `scrollable`,
            })
          : buildStyleWithMultiColumn(
              this.getDimensionsForReflowableContent(
                this.renderer.frameItem.isUsingVerticalWriting(),
                minimumWidth,
              ),
            )

        this.upsertCSS(`prose-reader-css`, frameStyle)

        this.executeOnLayoutBeforeMeasurementHook({ minimumWidth })

        if (this.renderer.frameItem.isUsingVerticalWriting()) {
          const pages = Math.ceil(
            frameElement.contentDocument.documentElement.scrollHeight /
              pageHeight,
          )
          contentHeight = pages * pageHeight

          this.renderer.frameItem.staticLayout({
            width: minimumWidth,
            height: contentHeight,
          })
        } else if (
          this.context.manifest?.renditionFlow === `scrolled-continuous`
        ) {
          /**
           * We take body content here because the frame body might be smaller after
           * layout due to possible image content and image ratio. We need to be able
           * to retrieve the actual real body height. The window height is probably the same
           * as the current frame set height which may be wrong after resize.
           */
          contentHeight = frameElement.contentDocument.body.scrollHeight
          this.latestContentHeightWhenLoaded = contentHeight

          this.renderer.frameItem.staticLayout({
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

          this.renderer.frameItem.staticLayout({
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
        if (this.context.isRTL() && !this.isUsingVerticalWriting()) {
          frameElement?.style.setProperty(`margin-left`, `${pageWidth}px`)
        }
      } else {
        frameElement?.style.setProperty(`margin-left`, `0px`)
      }

      this._layout({
        width: contentWidth,
        height: contentHeight,
        blankPagePosition,
        minimumWidth,
      })

      return { width: contentWidth, height: contentHeight }
    } else {
      this.executeOnLayoutBeforeMeasurementHook({ minimumWidth })
    }

    const height = this.latestContentHeightWhenLoaded || pageHeight

    this._layout({
      width: minimumWidth,
      height,
      blankPagePosition,
      minimumWidth,
    })

    return { width: minimumWidth, height }
  }
}
