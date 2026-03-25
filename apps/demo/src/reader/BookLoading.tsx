import { Stack, Text } from "@chakra-ui/react"

export const BookLoading = ({
  serviceWorkerReady,
}: {
  serviceWorkerReady: boolean
}) => {
  return (
    <Stack
      style={{
        height: "100%",
        width: "100%",
        position: "absolute",
        top: 0,
        left: 0,
        backgroundColor: "white",
        alignItems: "center",
        justifyContent: "center",
      }}
      color="black"
      gap={2}
      textAlign="center"
      px={4}
    >
      <Text fontSize="1xl">Loading book</Text>
      {!serviceWorkerReady && (
        <Text fontSize="sm" color="gray.500">
          The service worker is still loading. This can take a moment on some
          browsers. If it takes an unexpectedly long time, try reloading the
          page.
        </Text>
      )}
    </Stack>
  )
}
