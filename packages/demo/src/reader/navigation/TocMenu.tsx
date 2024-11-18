import { CheckCircleIcon } from "@chakra-ui/icons"
import { List, ListIcon, ListItem, Stack, Text } from "@chakra-ui/react"
import React from "react"
import { useReader } from "../useReader"
import { useObserve } from "reactjrx"
import { usePagination } from "../states"

export const TocMenu = ({ onNavigate }: { onNavigate: () => void }) => {
  const { reader } = useReader()
  const { manifest } = useObserve(() => reader?.context.state$, [reader]) ?? {}
  const { nav, renditionLayout } = manifest ?? {}
  const pagination = usePagination()
  const toc = nav?.toc || []
  const { beginSpineItemIndex, beginPageIndexInSpineItem } = pagination ?? {}
  const currentSpineItemOrChapterPageIndex =
    (renditionLayout === "reflowable" ? beginPageIndexInSpineItem : beginSpineItemIndex) || 0

  let currentSubChapter = pagination?.beginChapterInfo

  while (currentSubChapter?.subChapter) {
    currentSubChapter = currentSubChapter?.subChapter
  }

  const buildTocForItem = (tocItem: (typeof toc)[number], index: number, lvl: number) => (
    <React.Fragment key={index}>
      <ListItem
        style={{
          paddingLeft: 5 + lvl * 20,
          display: "flex",
          alignItems: "center"
        }}
        onClick={() => {
          onNavigate()

          reader?.navigation.goToUrl(tocItem.href)
        }}
        as="a"
        href="#"
      >
        {currentSubChapter?.path === tocItem.path && <ListIcon as={CheckCircleIcon} />}
        {currentSubChapter?.path !== tocItem.path && <ListIcon as={CheckCircleIcon} style={{ visibility: "hidden" }} />}
        <Stack gap={0}>
          <Text>{tocItem.title || tocItem.path}</Text>
          {currentSubChapter?.path === tocItem.path && (
            <Text
              fontStyle="italic"
              fontWeight="bold"
              fontSize="xs"
            >{`Currently on page ${currentSpineItemOrChapterPageIndex + 1}`}</Text>
          )}
        </Stack>
      </ListItem>
      {tocItem.contents.length > 0 && (
        <List as="div" spacing={2}>
          {tocItem.contents.map((tocItem, index) => buildTocForItem(tocItem, index, lvl + 1))}
        </List>
      )}
    </React.Fragment>
  )

  return (
    <List spacing={3} overflowY="auto" py={4} flex={1}>
      {nav?.toc.map((tocItem, index) => buildTocForItem(tocItem, index, 0))}
    </List>
  )
}
