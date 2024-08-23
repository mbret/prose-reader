import { CheckCircleIcon } from "@chakra-ui/icons"
import { List, ListIcon, ListItem, Text } from "@chakra-ui/react"
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
  const currentPage = (renditionLayout === "reflowable" ? beginPageIndexInSpineItem : beginSpineItemIndex) || 0

  let currentSubChapter = pagination?.beginChapterInfo

  while (currentSubChapter?.subChapter) {
    currentSubChapter = currentSubChapter?.subChapter
  }

  const buildTocForItem = (tocItem: (typeof toc)[number], index: number, lvl: number) => (
    <React.Fragment key={index}>
      <ListItem
        style={{
          paddingLeft: 10 + lvl * 20,
          display: "flex",
          alignItems: "center"
        }}
        onClick={() => {
          onNavigate()
          reader?.navigation.goToUrl(tocItem.href)
        }}
      >
        {currentSubChapter?.path === tocItem.path && <ListIcon as={CheckCircleIcon} />}
        {currentSubChapter?.path !== tocItem.path && <ListIcon as={CheckCircleIcon} style={{ visibility: "hidden" }} />}
        <div>
          {tocItem.title || "unknown"}
          {currentSubChapter?.path === tocItem.path && (
            <>
              <br />{" "}
              <Text style={{ fontSize: `0.8rem`, color: `rgba(0, 0, 0, 0.54)` }}>{`Currently on page ${currentPage + 1}`}</Text>
            </>
          )}
        </div>
      </ListItem>
      {tocItem.contents.length > 0 && (
        <List as="div" spacing={2}>
          {tocItem.contents.map((tocItem, index) => buildTocForItem(tocItem, index, lvl + 1))}
        </List>
      )}
    </React.Fragment>
  )

  return (
    <List spacing={3} overflowY="auto" py={4}>
      {nav?.toc.map((tocItem, index) => buildTocForItem(tocItem, index, 0))}
    </List>
  )
}
