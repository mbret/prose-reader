import { distinctUntilChanged, map, withLatestFrom } from "rxjs"
import { Reader } from "../../reader"
import { isShallowEqual } from "../../utils/objects"

export type State = {
  canGoLeftSpineItem: boolean
  canGoRightSpineItem: boolean
}

export const createState = (reader: Reader) => {
  return reader.pagination.paginationInfo$.pipe(
    withLatestFrom(reader.context.$.manifest$),
    map(([paginationInfo, manifest]) => {
      const numberOfSpineItems = manifest?.spineItems.length ?? 0
      const isAtAbsoluteBeginning = paginationInfo.beginSpineItemIndex === 0 && paginationInfo.beginPageIndex === 0
      const isAtAbsoluteEnd =
        paginationInfo.endPageIndex === paginationInfo.endNumberOfPages - 1 &&
        paginationInfo.endSpineItemIndex === Math.max(numberOfSpineItems - 1, 0)

      return {
        canGoLeftSpineItem:
          (manifest?.readingDirection === "ltr" && !isAtAbsoluteBeginning) ||
          (manifest?.readingDirection === "rtl" && !isAtAbsoluteEnd),
        canGoRightSpineItem:
          (manifest?.readingDirection === "ltr" && !isAtAbsoluteEnd) ||
          (manifest?.readingDirection === "rtl" && !isAtAbsoluteBeginning),
      }
    }),
    distinctUntilChanged(isShallowEqual),
  )
}
