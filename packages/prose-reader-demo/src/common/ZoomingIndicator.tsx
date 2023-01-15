import React from "react"
import { Box, Icon } from "@chakra-ui/react"
import { useRecoilValue } from "recoil"
import { isZoomingState } from "../state"
import { AiOutlineZoomOut } from "react-icons/ai"
import { useReaderValue } from "../useReader"

export const ZoomingIndicator = () => {
  const isZooming = useRecoilValue(isZoomingState)
  const reader = useReaderValue()

  if (!isZooming) {
    return null
  }

  return (
    <Box
      as="button"
      style={{
        position: `fixed`,
        right: 15,
        top: 15,
        background: `black`,
        padding: 10,
        opacity: 0.5,
        borderRadius: 50
      }}
      onClick={() => {
        reader?.zoom.exit()
      }}
    >
      <Icon as={AiOutlineZoomOut} w={10} h={10} display="block" />
    </Box>
  )
}
