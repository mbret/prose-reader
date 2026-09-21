import type { Manifest } from "@prose-reader/core"
import { useQuery } from "@tanstack/react-query"
import { STREAMER_URL_PREFIX } from "../constants.shared"
import { getStreamerBaseUrl } from "../streamer/utils.shared"
import { webStreamer } from "../streamer/webStreamer"
import { useServiceWorkerReady } from "../useServiceWorkerReady"
import { isClientStreamedBook } from "./streaming"

export const useManifest = (epubKey: string) => {
  const serviceWorkerReady = useServiceWorkerReady()
  const isClientStreamed = isClientStreamedBook(epubKey)

  return useQuery({
    queryKey: ["manifest", epubKey],
    retry: false,
    enabled: isClientStreamed || serviceWorkerReady,
    queryFn: async () => {
      if (isClientStreamed) {
        const response = await webStreamer.fetchManifest({
          key: epubKey,
          baseUrl: `${getStreamerBaseUrl(new URL(window.location.href))}/${epubKey}/`,
        })

        if (response.status >= 400) {
          throw response
        }

        const bookManifest: Manifest = await response.json()

        return bookManifest
      }

      const response = await fetch(
        `${window.location.origin}/${STREAMER_URL_PREFIX}/${epubKey}/manifest`,
        {
          mode: `no-cors`,
        },
      )
      const bookManifest: Manifest = await response.json()

      return bookManifest
    },
    refetchOnMount: false,
    refetchOnReconnect: false,
    refetchOnWindowFocus: false,
  })
}
