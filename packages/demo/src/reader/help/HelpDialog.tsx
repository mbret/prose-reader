import { List, ListIcon, ListItem } from "@chakra-ui/react"
import React from "react"
import { FullScreenModal } from "../../common/FullScreenModal"

export const HelpDialog = ({ onExit, isOpen }: { onExit: () => void; isOpen: boolean }) => {
  return (
    <FullScreenModal isOpen={isOpen} onClose={onExit} title="Help">
      <List spacing={3} style={{ margin: 20 }}>
        <ListItem>
          <ListIcon color="green.500" />
          Pinch to zoom on images.
        </ListItem>
      </List>
    </FullScreenModal>
  )
}
