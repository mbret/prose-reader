import { Manifest } from "@prose-reader/core"
import { useQuery } from "reactjrx"
import { STREAMER_URL_PREFIX } from "../constants.shared"
import { webStreamer } from "../streamer/webStreamer"
import { getStreamerBaseUrl } from "../streamer/utils.shared"

export const useManifest = (epubKey: string) =>
  useQuery({
    queryKey: ["manifest", epubKey],
    retry: false,
    queryFn: async () => {
      const demoEpubUrl = atob(epubKey)

      /**
       * Some books cannot be manipulated through service workers.
       * For such specific cases we have the client streamer.
       * This is usually for when we have book that cannot return
       * serialized resources (eg: pdfjs).
       */
      if (demoEpubUrl.endsWith(`.pdf`)) {
        const response = await webStreamer.fetchManifest({
          key: epubKey,
          baseUrl: `${getStreamerBaseUrl(new URL(window.location.href))}/${epubKey}/`
        })

        if (response.status >= 400) {
          throw response
        }

        const bookManifest: Manifest = await response.json()

        return bookManifest
      }

      const response = await fetch(`${window.location.origin}/${STREAMER_URL_PREFIX}/${epubKey}/manifest`, {
        mode: `no-cors`
      })
      const bookManifest: Manifest = await response.json()

      return bookManifest
    },
    refetchOnMount: false,
    refetchOnReconnect: false,
    refetchOnWindowFocus: false
  })
