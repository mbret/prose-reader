import { Box, Presence, Text } from "@chakra-ui/react"
import { useReaderContextValue } from "../context/useReaderContext"
import { usePagination } from "../pagination/usePagination"

const ANIMATION_NAME_IN_OUT = { _open: "fade-in", _closed: "fade-out" }

export const FloatingProgress = () => {
  const { enableFloatingProgress, quickMenuOpen } = useReaderContextValue([
    "enableFloatingProgress",
    "quickMenuOpen",
  ])
  const pagination = usePagination()
  const roundedProgress = Math.floor(
    (pagination?.percentageEstimateOfBook ?? 0) * 100,
  )
  const displayableProgress = roundedProgress > 0 ? roundedProgress : 1

  if (
    pagination?.percentageEstimateOfBook === undefined ||
    !enableFloatingProgress
  )
    return null

  return (
    <Presence
      present={!quickMenuOpen}
      animationName={ANIMATION_NAME_IN_OUT}
      animationDuration="moderate"
    >
      <Box
        position="absolute"
        right={0}
        bottom={0}
        p={2}
        WebkitTextStroke="2px black"
        paintOrder="stroke fill"
        pointerEvents="none"
        letterSpacing={1}
        color="white"
      >
        <Text fontSize="md">{displayableProgress} %</Text>
      </Box>
    </Presence>
  )
}
