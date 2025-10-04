import { Box } from "@chakra-ui/react"
import { memo } from "react"
import { TimeIndicator } from "../quickmenu/TimeIndicator"
import { useQuickMenu } from "../quickmenu/useQuickMenu"

export const FloatingTime = memo(() => {
  const [quickMenuOpen] = useQuickMenu()

  return (
    <Box
      position="absolute"
      left={0}
      bottom={0}
      p={2}
      color={quickMenuOpen ? undefined : "colorPalette.contrast"}
    >
      <TimeIndicator />
    </Box>
  )
})
