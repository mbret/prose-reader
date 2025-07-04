import { map, type Observable } from "rxjs"
import type { SpineItem } from "../.."
import type { Context } from "../../context/Context"
import type { ReaderSettingsManager } from "../../settings/ReaderSettingsManager"
import type { Viewport } from "../../viewport/Viewport"
import type { SpineItemsManager } from "../SpineItemsManager"
import { SpineItemSpineLayout } from "../types"

export const layoutItem = ({
  horizontalOffset,
  verticalOffset,
  context,
  spineItemsManager,
  isGloballyPrePaginated,
  settings,
  index,
  item,
  viewport,
}: {
  horizontalOffset: number
  verticalOffset: number
  context: Context
  spineItemsManager: SpineItemsManager
  isGloballyPrePaginated: boolean
  settings: ReaderSettingsManager
  item: SpineItem
  index: number
  viewport: Viewport
}): Observable<{
  horizontalOffset: number
  verticalOffset: number
  layoutPosition: SpineItemSpineLayout
}> => {
  let minimumWidth = viewport.value.pageSize.width
  let blankPagePosition: `none` | `before` | `after` = `none`
  const isScreenStartItem =
    horizontalOffset % viewport.absoluteViewport.width === 0
  const isLastItem = index === spineItemsManager.items.length - 1

  if (settings.values.computedSpreadMode) {
    /**
     * for now every reflowable content that has reflow siblings takes the entire screen by default
     * this simplify many things and I am not sure the specs allow one reflow
     * to end and an other one to start on the same screen anyway
     *
     * @important
     * For now this is impossible to have reflow not taking all screen. This is because
     * when an element is unloaded, the next element will move back its x axis, then an adjustment
     * will occurs and the previous element will become visible again, meaning it will be loaded,
     * therefore pushing the focused element, meaning adjustment again, then unload of previous one,
     * ... infinite loop. Due to the nature of reflow it's pretty much impossible to not load the entire
     * book with spread on to make it work.
     *
     * @important
     * When the book is globally pre-paginated we will not apply any of this even if each item is
     * reflowable. This is mostly a publisher mistake but does not comply with spec. Therefore
     * we ignore it
     */
    if (
      !isGloballyPrePaginated &&
      item.renditionLayout === `reflowable` &&
      !isLastItem
    ) {
      minimumWidth = viewport.value.pageSize.width * 2
    }

    // mainly to make loading screen looks good
    if (
      !isGloballyPrePaginated &&
      item.renditionLayout === `reflowable` &&
      isLastItem &&
      isScreenStartItem
    ) {
      minimumWidth = viewport.value.pageSize.width * 2
    }

    const lastItemStartOnNewScreenInAPrepaginatedBook =
      isScreenStartItem && isLastItem && isGloballyPrePaginated

    if (item.item.pageSpreadRight && isScreenStartItem && !context.isRTL()) {
      blankPagePosition = `before`
      minimumWidth = viewport.value.pageSize.width * 2
    } else if (
      item.item.pageSpreadLeft &&
      isScreenStartItem &&
      context.isRTL()
    ) {
      blankPagePosition = `before`
      minimumWidth = viewport.value.pageSize.width * 2
    } else if (lastItemStartOnNewScreenInAPrepaginatedBook) {
      if (context.isRTL()) {
        blankPagePosition = `before`
      } else {
        blankPagePosition = `after`
      }

      minimumWidth = viewport.value.pageSize.width * 2
    }
  }

  // we trigger an item layout which will update the visual and return
  // us with the item new eventual layout information.
  // This step is not yet about moving item or adjusting position.
  const itemLayout$ = item.layout.layout({
    minimumWidth,
    blankPagePosition,
    spreadPosition: settings.values.computedSpreadMode
      ? isScreenStartItem
        ? context.isRTL()
          ? `right`
          : `left`
        : context.isRTL()
          ? `left`
          : `right`
      : `none`,
  })

  return itemLayout$.pipe(
    map(({ width, height }) => {
      if (settings.values.computedPageTurnDirection === `vertical`) {
        const currentValidEdgeYForVerticalPositioning = isScreenStartItem
          ? verticalOffset
          : verticalOffset - viewport.absoluteViewport.height
        const currentValidEdgeXForVerticalPositioning = isScreenStartItem
          ? 0
          : horizontalOffset

        if (context.isRTL()) {
          item.layout.adjustPositionOfElement({
            top: currentValidEdgeYForVerticalPositioning,
            left: currentValidEdgeXForVerticalPositioning,
          })
        } else {
          item.layout.adjustPositionOfElement({
            top: currentValidEdgeYForVerticalPositioning,
            left: currentValidEdgeXForVerticalPositioning,
          })
        }

        const newEdgeX = width + currentValidEdgeXForVerticalPositioning
        const newEdgeY = height + currentValidEdgeYForVerticalPositioning

        const layoutPosition = new SpineItemSpineLayout({
          left: currentValidEdgeXForVerticalPositioning,
          right: newEdgeX,
          top: currentValidEdgeYForVerticalPositioning,
          bottom: newEdgeY,
          height,
          width,
          x: currentValidEdgeXForVerticalPositioning,
          y: currentValidEdgeYForVerticalPositioning,
        })

        return {
          horizontalOffset: newEdgeX,
          verticalOffset: newEdgeY,
          layoutPosition,
        }
      }

      // We can now adjust the position of the item if needed based on its new layout.
      // For simplification we use an edge offset, which means for LTR it will be x from left and for RTL
      // it will be x from right
      item.layout.adjustPositionOfElement(
        context.isRTL()
          ? { right: horizontalOffset, top: 0 }
          : { left: horizontalOffset, top: 0 },
      )

      const left = context.isRTL()
        ? viewport.absoluteViewport.width - horizontalOffset - width
        : horizontalOffset

      const layoutPosition = new SpineItemSpineLayout({
        right: context.isRTL()
          ? viewport.absoluteViewport.width - horizontalOffset
          : horizontalOffset + width,
        left,
        x: left,
        top: verticalOffset,
        bottom: height,
        height,
        width,
        y: verticalOffset,
      })

      return {
        horizontalOffset: horizontalOffset + width,
        verticalOffset: 0,
        layoutPosition,
      }
    }),
  )
}
