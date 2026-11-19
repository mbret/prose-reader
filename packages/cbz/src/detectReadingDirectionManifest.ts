import type { StreamerManifestHookFactory } from "@prose-reader/streamer"
import { isCbzArchive } from "./isCbzArchive.ts"

export const detectReadingDirectionManifest: StreamerManifestHookFactory =
  ({ archive }) =>
  (manifest) => {
    if (manifest.readingDirection !== undefined) return manifest
    if (!isCbzArchive(archive)) return manifest

    return {
      ...manifest,
      readingDirection: "rtl",
    }
  }
