import { List, ListIcon, ListItem } from "@chakra-ui/react"
import React from "react"
import { useRecoilValue } from "recoil"
import { paginationState } from "./state"
import { FullScreenModal } from "./common/FullScreenModal"

export const HelpDialog = ({ onExit, isOpen }: { onExit: () => void; isOpen: boolean }) => {
  const pagination = useRecoilValue(paginationState)

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
