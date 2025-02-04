import { Box, Text } from "@chakra-ui/react"
import { usePagination } from "../pagination/usePagination"

export const FloatingProgress = () => {
  const pagination = usePagination()
  const roundedProgress = Math.floor(
    (pagination?.percentageEstimateOfBook ?? 0) * 100,
  )
  const displayableProgress = roundedProgress > 0 ? roundedProgress : 1

  if (pagination?.percentageEstimateOfBook === undefined) return null

  return (
    <Box position="absolute" right={0} bottom={0} p={2}>
      <Text fontSize="sm">{displayableProgress} %</Text>
    </Box>
  )
}
