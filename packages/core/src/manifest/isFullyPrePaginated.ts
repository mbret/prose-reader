import type { Manifest } from "@prose-reader/shared"

export const isFullyPrePaginated = (manifest?: Manifest) =>
  manifest?.spineItems.every(
    (item) =>
      (item.renditionLayout ?? manifest.renditionLayout) === "pre-paginated",
  )
