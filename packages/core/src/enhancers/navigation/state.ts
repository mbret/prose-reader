import { distinctUntilChanged, map, withLatestFrom } from "rxjs"
import type { Reader } from "../../reader"
import { isShallowEqual } from "../../utils/objects"

export type State = ReturnType<typeof observeState>

/**
 * Which spine-item navigations have somewhere to go from what is visible.
 *
 * Reading direction is resolved with `context.isRTL()`, the same check the
 * spine-item navigators use, so the two agree on which way left and right go
 * (a manifest without a direction reads as ltr for both).
 */
export const observeState = (reader: Reader) =>
  reader.pagination.state$.pipe(
    withLatestFrom(reader.settings.values$),
    map(([{ begin, end }, { computedPageTurnDirection }]) => {
      const lastSpineItemIndex = Math.max(
        reader.context.manifest.spineItems.length - 1,
        0,
      )
      const hasPreviousSpineItem = begin.spineItemIndex !== 0
      const hasNextSpineItem = end.spineItemIndex !== lastSpineItemIndex
      const isVertical = computedPageTurnDirection === "vertical"
      const isRTL = reader.context.isRTL()

      return {
        canGoTopSpineItem: isVertical && hasPreviousSpineItem,
        canGoBottomSpineItem: isVertical && hasNextSpineItem,
        canGoLeftSpineItem:
          !isVertical && (isRTL ? hasNextSpineItem : hasPreviousSpineItem),
        canGoRightSpineItem:
          !isVertical && (isRTL ? hasPreviousSpineItem : hasNextSpineItem),
      }
    }),
    distinctUntilChanged(isShallowEqual),
  )
