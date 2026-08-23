import { Stack, Text } from "@chakra-ui/react"
import { SERVICE_WORKER_SUPPORTED } from "../serviceWorker/registerServiceWorker"

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
          {SERVICE_WORKER_SUPPORTED
            ? `The service worker is still loading. This can take a moment on some
          browsers. If it takes an unexpectedly long time, try reloading the
          page.`
            : `This browser does not support service workers, which the demo needs
          to stream books.`}
        </Text>
      )}
    </Stack>
  )
}
