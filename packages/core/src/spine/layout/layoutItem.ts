import { type Observable, map } from "rxjs"
import type { SpineItem } from "../.."
import type { Context } from "../../context/Context"
import type { ReaderSettingsManager } from "../../settings/ReaderSettingsManager"
import type { SpineItemsManager } from "../SpineItemsManager"
import type { LayoutPosition } from "../SpineLayout"

export const layoutItem = ({
  horizontalOffset,
  verticalOffset,
  context,
  spineItemsManager,
  isGloballyPrePaginated,
  settings,
  index,
  item,
}: {
  horizontalOffset: number
  verticalOffset: number
  context: Context
  spineItemsManager: SpineItemsManager
  isGloballyPrePaginated: boolean
  settings: ReaderSettingsManager
  item: SpineItem
  index: number
}): Observable<{ horizontalOffset: number; verticalOffset: number }> => {
  let minimumWidth = context.getPageSize().width
  let blankPagePosition: `none` | `before` | `after` = `none`
  const isScreenStartItem =
    horizontalOffset % context.state.visibleAreaRect.width === 0
  const isLastItem = index === spineItemsManager.items.length - 1

  if (context.state.isUsingSpreadMode) {
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
      minimumWidth = context.getPageSize().width * 2
    }

    // mainly to make loading screen looks good
    if (
      !isGloballyPrePaginated &&
      item.renditionLayout === `reflowable` &&
      isLastItem &&
      isScreenStartItem
    ) {
      minimumWidth = context.getPageSize().width * 2
    }

    const lastItemStartOnNewScreenInAPrepaginatedBook =
      isScreenStartItem && isLastItem && isGloballyPrePaginated

    if (item.item.pageSpreadRight && isScreenStartItem && !context.isRTL()) {
      blankPagePosition = `before`
      minimumWidth = context.getPageSize().width * 2
    } else if (
      item.item.pageSpreadLeft &&
      isScreenStartItem &&
      context.isRTL()
    ) {
      blankPagePosition = `before`
      minimumWidth = context.getPageSize().width * 2
    } else if (lastItemStartOnNewScreenInAPrepaginatedBook) {
      if (context.isRTL()) {
        blankPagePosition = `before`
      } else {
        blankPagePosition = `after`
      }

      minimumWidth = context.getPageSize().width * 2
    }
  }

  // we trigger an item layout which will update the visual and return
  // us with the item new eventual layout information.
  // This step is not yet about moving item or adjusting position.
  const itemLayout$ = item.layout({
    minimumWidth,
    blankPagePosition,
    spreadPosition: context.state.isUsingSpreadMode
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
          : verticalOffset - context.state.visibleAreaRect.height
        const currentValidEdgeXForVerticalPositioning = isScreenStartItem
          ? 0
          : horizontalOffset

        if (context.isRTL()) {
          item.adjustPositionOfElement({
            top: currentValidEdgeYForVerticalPositioning,
            left: currentValidEdgeXForVerticalPositioning,
          })
        } else {
          item.adjustPositionOfElement({
            top: currentValidEdgeYForVerticalPositioning,
            left: currentValidEdgeXForVerticalPositioning,
          })
        }

        const newEdgeX = width + currentValidEdgeXForVerticalPositioning
        const newEdgeY = height + currentValidEdgeYForVerticalPositioning

        return {
          horizontalOffset: newEdgeX,
          verticalOffset: newEdgeY,
        }
      }

      // We can now adjust the position of the item if needed based on its new layout.
      // For simplification we use an edge offset, which means for LTR it will be x from left and for RTL
      // it will be x from right
      item.adjustPositionOfElement(
        context.isRTL()
          ? { right: horizontalOffset, top: 0 }
          : { left: horizontalOffset, top: 0 },
      )

      return {
        horizontalOffset: horizontalOffset + width,
        verticalOffset: 0,
      }
    }),
  )
}
