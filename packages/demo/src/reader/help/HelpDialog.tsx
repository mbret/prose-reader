import { List, ListIcon, ListItem } from "@chakra-ui/react"
import React from "react"

export const HelpMenu = () => {
  return (
    <List spacing={3}>
      <ListItem>
        <ListIcon color="green.500" />
        Pinch to zoom on images.
      </ListItem>
    </List>
  )
}
