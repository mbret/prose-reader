import { Manifest } from "@prose-reader/core"
import { useQuery } from "react-query"
import { Report } from "./report"
import { STREAMER_URL_PREFIX } from "./serviceWorker/constants"

export const useManifest = (epubUrl: string) =>
  useQuery(
    ["manifest", epubUrl],
    async () => {
      const response = await fetch(`${window.location.origin}/${STREAMER_URL_PREFIX}/${epubUrl}/manifest`, {
        mode: `no-cors`
      })
      const bookManifest: Manifest = await response.json()

      return bookManifest
    },
    {
      onError: Report.error
    }
  )
