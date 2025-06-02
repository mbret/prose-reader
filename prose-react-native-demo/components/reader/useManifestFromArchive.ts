import type { Manifest } from "@prose-reader/shared"
import {
  type Archive,
  generateManifestFromArchive,
} from "@prose-reader/streamer"
import { useEffect, useState } from "react"

export const useManifestFromArchive = ({
  archive,
}: { archive: Archive | undefined | null }) => {
  const [manifest, setManifest] = useState<Manifest | null>(null)

  useEffect(() => {
    if (!archive) return

    ;(async () => {
      const manifest = await generateManifestFromArchive(archive)

      setManifest(manifest)
    })()
  }, [archive])

  return { data: manifest }
}
