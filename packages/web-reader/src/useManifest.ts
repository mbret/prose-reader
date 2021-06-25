import { Manifest } from "@oboku/reader"
import { useEffect, useState } from "react"
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
        } catch (e) {
          setManifest(undefined)
          setError(e)
        }
      })()
  }, [epubUrl])

  return { manifest, error }
}