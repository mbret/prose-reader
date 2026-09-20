import { usePagination } from "../pagination/usePagination"

export const useNavigationContext = () => {
  const pagination = usePagination()
  const hasOnlyOnePage = pagination?.numberOfTotalPages === 1

  const isBeginWithinChapter =
    (pagination?.begin.numberOfPagesInSpineItem ?? 0) > 1

  const isEndWithinChapter = (pagination?.end.numberOfPagesInSpineItem ?? 0) > 1

  const beginPageIndex =
    (pagination?.hasChapters
      ? pagination?.begin.pageIndexInSpineItem
      : pagination?.begin.absolutePageIndex) ?? 0
  const endPageIndex =
    (pagination?.hasChapters
      ? pagination?.end.pageIndexInSpineItem
      : pagination?.end.absolutePageIndex) ?? 0

  const [leftPageIndex = 0, rightPageIndex = 0] = [
    beginPageIndex,
    endPageIndex,
  ].sort((a, b) => a - b)

  const beginAndEndAreDifferent =
    pagination?.begin.pageIndexInSpineItem !==
      pagination?.end.pageIndexInSpineItem ||
    pagination?.begin.spineItemIndex !== pagination?.end.spineItemIndex

  const totalApproximatePages = pagination?.hasChapters
    ? pagination?.begin.numberOfPagesInSpineItem
    : pagination?.numberOfTotalPages

  return {
    hasOnlyOnePage,
    beginPageIndex,
    endPageIndex,
    isBeginWithinChapter,
    isEndWithinChapter,
    beginAndEndAreDifferent,
    totalApproximatePages,
    leftPageIndex,
    rightPageIndex,
  }
}
