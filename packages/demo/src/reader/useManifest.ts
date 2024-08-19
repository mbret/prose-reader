import { Manifest } from "@prose-reader/core"
import { STREAMER_URL_PREFIX } from "../serviceWorker/constants"
import { useQuery } from "reactjrx"

export const useManifest = (epubUrl: string) =>
  useQuery({
    queryKey: ["manifest", epubUrl],
    queryFn: async () => {
      const response = await fetch(`${window.location.origin}/${STREAMER_URL_PREFIX}/${epubUrl}/manifest`, {
        mode: `no-cors`
      })
      const bookManifest: Manifest = await response.json()

      return bookManifest
    },
    refetchOnMount: false,
    refetchOnReconnect: false,
    refetchOnWindowFocus: false
  })
