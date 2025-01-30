import { HStack, Stack, Text } from "@chakra-ui/react"
import { usePagination } from "../../pagination/usePagination"
import {
  ProgressBar,
  ProgressRoot,
  ProgressValueText,
} from "../../components/ui/progress"

export const PaginationInfoSection = () => {
  const pagination = usePagination()
  const hasOnlyOnePage = pagination?.numberOfTotalPages === 1
  const beginPageIndex =
    (pagination?.hasChapters
      ? pagination?.beginPageIndexInSpineItem
      : pagination?.beginAbsolutePageIndex) ?? 0
  const endPageIndex =
    (pagination?.hasChapters
      ? pagination?.endPageIndexInSpineItem
      : pagination?.endAbsolutePageIndex) ?? 0
  const [leftPageIndex, rightPageIndex] = [beginPageIndex, endPageIndex].sort(
    (a, b) => a - b,
  )
  const beginAndEndAreDifferent =
    pagination?.beginPageIndexInSpineItem !==
      pagination?.endPageIndexInSpineItem ||
    pagination?.beginSpineItemIndex !== pagination?.endSpineItemIndex
  const numberOfTotalPages = pagination?.hasChapters
    ? pagination?.beginNumberOfPagesInSpineItem
    : pagination?.numberOfTotalPages

  const progress = Math.round((pagination?.percentageEstimateOfBook ?? 0) * 100)

  const buildTitleChain = (
    chapterInfo: NonNullable<typeof pagination>["beginChapterInfo"],
  ): string => {
    if (chapterInfo?.subChapter) {
      return `${chapterInfo.title} / ${buildTitleChain(chapterInfo.subChapter)}`
    }
    return chapterInfo?.title || ""
  }

  const chapterTitle = buildTitleChain(pagination?.beginChapterInfo)

  return (
    <Stack alignItems="center">
      <ProgressRoot value={progress} size="xs" width={150}>
        <HStack justifyContent="space-between">
          <ProgressBar width={110} />
          <ProgressValueText>{`${progress}%`}</ProgressValueText>
        </HStack>
      </ProgressRoot>
      <Text truncate maxWidth="100%">
        {chapterTitle ? `Chapter: ${chapterTitle}` : `\u00A0`}
      </Text>
      {!hasOnlyOnePage && (
        <Text>
          {beginAndEndAreDifferent &&
            `${leftPageIndex + 1} - ${rightPageIndex + 1} of ${numberOfTotalPages}`}
          {!beginAndEndAreDifferent &&
            `${leftPageIndex + 1} of ${numberOfTotalPages}`}
        </Text>
      )}
    </Stack>
  )
}
