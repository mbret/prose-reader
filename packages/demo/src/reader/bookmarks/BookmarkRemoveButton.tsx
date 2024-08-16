import { Box, IconButton } from "@chakra-ui/react"
import React from "react"
import { CiBookmarkRemove } from "react-icons/ci"

export const BookmarkRemoveButton = ({ onClick }: { onClick: () => void }) => {
  return (
    <Box p={2} data-bookmark-area>
      <IconButton aria-label="bookmark" onClick={onClick} colorScheme="red" icon={<CiBookmarkRemove />} fontSize="35px">
        bookmark
      </IconButton>
    </Box>
  )
}
