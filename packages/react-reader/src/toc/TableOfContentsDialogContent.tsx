import { Link, List, Stack, Text } from "@chakra-ui/react"
import React, { memo } from "react"
import { LuCircleCheck } from "react-icons/lu"
import { useObserve } from "reactjrx"
import { useReader } from "../context/useReader"
import { usePagination } from "../pagination/usePagination"

export const TableOfContentsDialogContent = memo(
  ({ onNavigate }: { onNavigate: () => void }) => {
    const reader = useReader()
    const { manifest, assumedRenditionLayout } =
      useObserve(() => reader?.context, [reader]) ?? {}
    const { nav } = manifest ?? {}
    const pagination = usePagination()
    const toc = nav?.toc || []
    const { beginSpineItemIndex, beginPageIndexInSpineItem } = pagination ?? {}
    const currentSpineItemOrChapterPageIndex =
      (assumedRenditionLayout === "reflowable"
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
          pl={4 * (lvl + 1)}
          style={{
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
  },
)
