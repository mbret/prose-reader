import { Link, List, Stack, Text } from "@chakra-ui/react"
import React from "react"
import { useReader } from "../useReader"
import { useObserve } from "reactjrx"
import { usePagination } from "../states"
import { LuCircleCheck } from "react-icons/lu"

export const TocMenu = ({ onNavigate }: { onNavigate: () => void }) => {
  const { reader } = useReader()
  const { manifest } = useObserve(() => reader?.context.state$, [reader]) ?? {}
  const { nav, renditionLayout } = manifest ?? {}
  const pagination = usePagination()
  const toc = nav?.toc || []
  const { beginSpineItemIndex, beginPageIndexInSpineItem } = pagination ?? {}
  const currentSpineItemOrChapterPageIndex =
    (renditionLayout === "reflowable"
      ? beginPageIndexInSpineItem
      : beginSpineItemIndex) || 0

  let currentSubChapter = pagination?.beginChapterInfo

  while (currentSubChapter?.subChapter) {
    currentSubChapter = currentSubChapter?.subChapter
  }

  const buildTocForItem = (
    tocItem: (typeof toc)[number],
    index: number,
    lvl: number,
  ) => (
    <React.Fragment key={index}>
      <List.Item
        style={{
          paddingLeft: 5 + lvl * 20,
          display: "flex",
          alignItems: "center",
        }}
      >
        <Link
          onClick={() => {
            onNavigate()

            reader?.navigation.goToUrl(tocItem.href)
          }}
          href="#"
        >
          {currentSubChapter?.path === tocItem.path && (
            <List.Indicator asChild>
              <LuCircleCheck />
            </List.Indicator>
          )}
          {currentSubChapter?.path !== tocItem.path && (
            <List.Indicator asChild visibility="hidden">
              <LuCircleCheck />
            </List.Indicator>
          )}
          <Stack gap={0}>
            <Text fontSize="md">{tocItem.title || tocItem.path}</Text>
            {currentSubChapter?.path === tocItem.path && (
              <Text
                fontStyle="italic"
                fontWeight="bold"
                fontSize="sm"
              >{`Currently on page ${
                currentSpineItemOrChapterPageIndex + 1
              }`}</Text>
            )}
          </Stack>
        </Link>
      </List.Item>
      {tocItem.contents.length > 0 && (
        <List.Root as="div" gap={2}>
          {tocItem.contents.map((tocItem, index) =>
            buildTocForItem(tocItem, index, lvl + 1),
          )}
        </List.Root>
      )}
    </React.Fragment>
  )

  return (
    <List.Root gap={3} overflowY="auto" py={4} flex={1}>
      {nav?.toc.map((tocItem, index) => buildTocForItem(tocItem, index, 0))}
    </List.Root>
  )
}
