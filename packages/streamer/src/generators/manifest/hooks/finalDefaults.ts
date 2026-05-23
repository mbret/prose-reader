import type { Manifest } from "@prose-reader/shared"

export const finalDefaultsHook =
  () =>
  (manifest: Manifest): Manifest => ({
    ...manifest,
    readingDirection: manifest.readingDirection ?? "ltr",
  })
