import { Manifest } from "@prose-reader/core"
import { useEffect, useState } from "react"
import { Report } from "./report"
import { STREAMER_URL_PREFIX } from "./serviceWorker/constants"

export const useManifest = (epubUrl: string) => {
  const [manifest, setManifest] = useState<Manifest | undefined>(undefined)
  const [error, setError] = useState<Error | undefined>(undefined)

  useEffect(() => {
    setManifest(undefined)
    setError(undefined)

      ; (async () => {
        try {
          const response = await fetch(`${window.location.origin}/${STREAMER_URL_PREFIX}/${epubUrl}/manifest`, {
            mode: `no-cors`
          })
          const bookManifest: Manifest = await response.json()
          setManifest(bookManifest)

          Report.log(`manifest`, bookManifest)
        } catch (e: any) {
          setManifest(undefined)
          setError(e as any)
        }
      })()
  }, [epubUrl])

  return { manifest, error }
}