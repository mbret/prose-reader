import { Box } from "@chakra-ui/react"
import { TimeIndicator } from "./QuickMenu/TimeIndicator"
import { useQuickMenu } from "./QuickMenu/useQuickMenu"

export const FloatingTime = () => {
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
}
