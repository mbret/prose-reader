import { distinctUntilChanged, map, withLatestFrom } from "rxjs"
import { Reader } from "../../reader"
import { isShallowEqual } from "../../utils/objects"

export type State = ReturnType<typeof observeState>

export const observeState = (reader: Reader) => {
  return reader.pagination.pagination$.pipe(
    withLatestFrom(reader.context.manifest$, reader.settings.settings$),
    map(([paginationInfo, manifest, { computedPageTurnDirection }]) => {
      const numberOfSpineItems = manifest?.spineItems.length ?? 0
      const isAtAbsoluteBeginning = paginationInfo.beginSpineItemIndex === 0
      const isAtAbsoluteEnd =
        paginationInfo.endSpineItemIndex === Math.max(numberOfSpineItems - 1, 0)

      const isAtEndSpineItem =
        paginationInfo.endSpineItemIndex === Math.max(numberOfSpineItems - 1, 0)

      const isAtBeginSpineItem = paginationInfo.beginSpineItemIndex === 0

      return {
        canGoTopSpineItem:
          computedPageTurnDirection === "vertical" && !isAtAbsoluteBeginning,
        canGoBottomSpineItem:
          computedPageTurnDirection === "vertical" && !isAtAbsoluteEnd,
        canGoLeftSpineItem:
          computedPageTurnDirection !== "vertical" &&
          ((manifest?.readingDirection === "ltr" && !isAtAbsoluteBeginning) ||
            (manifest?.readingDirection === "rtl" && !isAtEndSpineItem)),
        canGoRightSpineItem:
          computedPageTurnDirection !== "vertical" &&
          ((manifest?.readingDirection === "ltr" && !isAtAbsoluteEnd) ||
            (manifest?.readingDirection === "rtl" && !isAtBeginSpineItem)),
      }
    }),
    distinctUntilChanged(isShallowEqual),
  )
}
