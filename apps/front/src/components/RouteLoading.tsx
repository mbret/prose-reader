import { Spinner, Stack } from "@chakra-ui/react"

/**
 * Shown while a lazily loaded route is being fetched. The demo chunk carries
 * the reading engine, so on a slow connection this is on screen for seconds.
 */
export const RouteLoading = () => (
  <Stack height="100%" alignItems="center" justifyContent="center">
    <Spinner size="lg" borderWidth="3px" color="gray.500" />
  </Stack>
)
