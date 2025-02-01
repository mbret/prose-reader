import { usePagination } from "../pagination/usePagination"

export const useNavigationContext = () => {
  const pagination = usePagination()
  const hasOnlyOnePage = pagination?.numberOfTotalPages === 1

  const isBeginWithinChapter =
    (pagination?.beginNumberOfPagesInSpineItem ?? 0) > 1

  const isEndWithinChapter = (pagination?.endNumberOfPagesInSpineItem ?? 0) > 1

  const beginPageIndex =
    (pagination?.hasChapters
      ? pagination?.beginPageIndexInSpineItem
      : pagination?.beginAbsolutePageIndex) ?? 0
  const endPageIndex =
    (pagination?.hasChapters
      ? pagination?.endPageIndexInSpineItem
      : pagination?.endAbsolutePageIndex) ?? 0

  const [leftPageIndex = 0, rightPageIndex = 0] = [
    beginPageIndex,
    endPageIndex,
  ].sort((a, b) => a - b)

  const beginAndEndAreDifferent =
    pagination?.beginPageIndexInSpineItem !==
      pagination?.endPageIndexInSpineItem ||
    pagination?.beginSpineItemIndex !== pagination?.endSpineItemIndex

  const totalApproximatePages = pagination?.hasChapters
    ? pagination?.beginNumberOfPagesInSpineItem
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
