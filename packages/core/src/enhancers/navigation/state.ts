import { distinctUntilChanged, map, withLatestFrom } from "rxjs"
import type { Reader } from "../../reader"
import { isShallowEqual } from "../../utils/objects"

export type State = ReturnType<typeof observeState>

export const observeState = (reader: Reader) => {
  return reader.pagination.state$.pipe(
    withLatestFrom(reader.context.manifest$, reader.settings.values$),
    map(
      ([
        paginationInfo,
        { spineItems, readingDirection },
        { computedPageTurnDirection },
      ]) => {
        const numberOfSpineItems = spineItems.length ?? 0
        const isAtAbsoluteBeginning = paginationInfo.beginSpineItemIndex === 0
        const isAtAbsoluteEnd =
          paginationInfo.endSpineItemIndex ===
          Math.max(numberOfSpineItems - 1, 0)

        const isAtEndSpineItem =
          paginationInfo.endSpineItemIndex ===
          Math.max(numberOfSpineItems - 1, 0)

        const isAtBeginSpineItem = paginationInfo.beginSpineItemIndex === 0

        const isAtBeginFirstPage =
          paginationInfo.beginPageIndexInSpineItem === 0

        const isAtEndLastPage =
          paginationInfo.endPageIndexInSpineItem ===
          paginationInfo.endNumberOfPagesInSpineItem - 1

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
      },
    ),
    distinctUntilChanged(isShallowEqual),
  )
}
