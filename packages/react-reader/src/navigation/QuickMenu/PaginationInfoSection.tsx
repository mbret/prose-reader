import { HStack, Stack, Text } from "@chakra-ui/react"
import {
  ProgressBar,
  ProgressRoot,
  ProgressValueText,
} from "../../components/ui/progress"
import { usePagination } from "../../pagination/usePagination"
import { useNavigationContext } from "../useNavigationContext"

export const PaginationInfoSection = () => {
  const pagination = usePagination()
  const {
    hasOnlyOnePage,
    leftPageIndex,
    rightPageIndex,
    totalApproximatePages,
    beginAndEndAreDifferent,
  } = useNavigationContext()
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
    <Stack alignItems="center" gap={1} maxW="100%" overflow="auto">
      <ProgressRoot value={progress} size="xs" width={150}>
        <HStack justifyContent="space-between">
          <ProgressBar width={110} />
          <ProgressValueText>{`${progress}%`}</ProgressValueText>
        </HStack>
      </ProgressRoot>
      <Text truncate maxWidth="100%" fontSize="sm" mt={1}>
        {chapterTitle ? `Chapter: ${chapterTitle}` : `\u00A0`}
      </Text>
      {!hasOnlyOnePage && (
        <HStack>
          <Text fontSize="xs">
            {beginAndEndAreDifferent
              ? `${leftPageIndex + 1} - ${rightPageIndex + 1} of ${totalApproximatePages}`
              : `${leftPageIndex + 1} of ${totalApproximatePages}`}
          </Text>
          {!!pagination?.hasChapters && (
            <>
              <Text>-</Text>
              <Text fontSize="xs">
                ({(pagination?.beginAbsolutePageIndex ?? 0) + 1})
              </Text>
            </>
          )}
        </HStack>
      )}
    </Stack>
  )
}
