import { Box } from "@chakra-ui/react"
import { TimeIndicator } from "./QuickMenu/TimeIndicator"

export const FloatingTime = () => {
  return (
    <Box position="absolute" left={0} bottom={0} p={2}>
      <TimeIndicator />
    </Box>
  )
}
