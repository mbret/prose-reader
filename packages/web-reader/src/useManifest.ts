import { Manifest } from "@oboku/reader"
import { useEffect, useState } from "react"

export const useManifest = (epubUrl: string) => {
  const [manifest, setManifest] = useState<Manifest | undefined>(undefined)

  useEffect(() => {
    (async () => {
      const response = await fetch(`${window.location.origin}/reader/${epubUrl}/manifest`)
      const bookManifest: Manifest = await response.json()
      setManifest(bookManifest)
    })()
  }, [epubUrl])


  return manifest
}