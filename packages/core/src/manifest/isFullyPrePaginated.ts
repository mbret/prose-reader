import { Manifest } from "@prose-reader/shared"

export const isFullyPrePaginated = (manifest?: Manifest) =>
  manifest?.renditionLayout === "pre-paginated" || manifest?.spineItems.every((item) => item.renditionLayout === "pre-paginated")
