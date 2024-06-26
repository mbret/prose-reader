import { List, ListIcon, ListItem } from "@chakra-ui/react"
import React from "react"
import { FullScreenModal } from "../common/FullScreenModal"
import { usePagination } from "./state"
import { useReader } from "./useReader"

export const HelpDialog = ({ onExit, isOpen }: { onExit: () => void; isOpen: boolean }) => {
  const { reader$ } = useReader()
  const pagination = usePagination(reader$)

  let currentSubChapter = pagination?.beginChapterInfo

  while (currentSubChapter?.subChapter) {
    currentSubChapter = currentSubChapter?.subChapter
  }

  return (
    <FullScreenModal isOpen={isOpen} onClose={onExit} title="Help">
      <List spacing={3} style={{ margin: 20 }}>
        <ListItem>
          <ListIcon color="green.500" />
          You can zoom on images by double clicking on it. Double click again to leave the zoom mode.
        </ListItem>
      </List>
    </FullScreenModal>
  )
}
