import { Box } from "@chakra-ui/react"
import { memo } from "react"
import { TimeIndicator } from "../quickmenu/TimeIndicator"

export const FloatingTime = memo(() => {
  return (
    <Box
      position="absolute"
      left={0}
      bottom={0}
      p={2}
      color="white"
      WebkitTextStroke="2px black"
      paintOrder="stroke fill"
      pointerEvents="none"
      letterSpacing={1}
    >
      <TimeIndicator />
    </Box>
  )
})
