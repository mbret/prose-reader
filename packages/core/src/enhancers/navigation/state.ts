import { distinctUntilChanged, map, withLatestFrom } from "rxjs"
import type { Reader } from "../../reader"
import { isShallowEqual } from "../../utils/objects"

export type State = ReturnType<typeof observeState>

export const observeState = (reader: Reader) => {
  return reader.pagination.state$.pipe(
    withLatestFrom(reader.settings.values$),
    map(([paginationInfo, { computedPageTurnDirection }]) => {
      const { spineItems, readingDirection } = reader.context.manifest
      const numberOfSpineItems = spineItems.length ?? 0
      const isAtAbsoluteBeginning = paginationInfo.begin.spineItemIndex === 0
      const isAtAbsoluteEnd =
        paginationInfo.end.spineItemIndex ===
        Math.max(numberOfSpineItems - 1, 0)

      const isAtEndSpineItem =
        paginationInfo.end.spineItemIndex ===
        Math.max(numberOfSpineItems - 1, 0)

      const isAtBeginSpineItem = paginationInfo.begin.spineItemIndex === 0

      const isAtBeginFirstPage = paginationInfo.begin.pageIndexInSpineItem === 0

      const isAtEndLastPage =
        paginationInfo.end.pageIndexInSpineItem ===
        paginationInfo.end.numberOfPagesInSpineItem - 1

      return {
        canTurnLeft:
          computedPageTurnDirection === "vertical"
            ? false
            : !isAtBeginFirstPage,
        canTurnRight:
          computedPageTurnDirection === "vertical" ? false : !isAtEndLastPage,
        canGoTopSpineItem:
          computedPageTurnDirection === "vertical" && !isAtAbsoluteBeginning,
        canGoBottomSpineItem:
          computedPageTurnDirection === "vertical" && !isAtAbsoluteEnd,
        canGoLeftSpineItem:
          computedPageTurnDirection !== "vertical" &&
          ((readingDirection === "ltr" && !isAtAbsoluteBeginning) ||
            (readingDirection === "rtl" && !isAtEndSpineItem)),
        canGoRightSpineItem:
          computedPageTurnDirection !== "vertical" &&
          ((readingDirection === "ltr" && !isAtAbsoluteEnd) ||
            (readingDirection === "rtl" && !isAtBeginSpineItem)),
      }
    }),
    distinctUntilChanged(isShallowEqual),
  )
}
