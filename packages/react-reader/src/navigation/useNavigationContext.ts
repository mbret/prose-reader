import type { Reader } from "@prose-reader/core"
import { useReader } from "../context/useReader.ts"
import { usePagination } from "../pagination/usePagination.ts"

export const useNavigationContext = () => {
  const reader = useReader()
  const pagination = usePagination()
  const hasOnlyOnePage = pagination?.numberOfTotalPages === 1

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

  /**
   * Goes to a page counted the way `beginPageIndex` and
   * `totalApproximatePages` count it: in the spine item the view begins with
   * when the book has chapters, in the whole book otherwise.
   */
  const goToPageIndex = ({
    pageIndex,
    animation,
  }: {
    pageIndex: number
  } & Pick<
    Parameters<Reader["navigation"]["goToAbsolutePageIndex"]>[0],
    "animation"
  >) => {
    if (pagination?.hasChapters) {
      reader?.navigation.goToPageOfSpineItem({
        pageIndex,
        spineItemId: pagination.begin.spineItemIndex ?? 0,
        animation,
      })
    } else {
      reader?.navigation.goToAbsolutePageIndex({
        absolutePageIndex: pageIndex,
        animation,
      })
    }
  }

  return {
    hasOnlyOnePage,
    beginPageIndex,
    endPageIndex,
    beginAndEndAreDifferent,
    totalApproximatePages,
    leftPageIndex,
    rightPageIndex,
    goToPageIndex,
  }
}
