import { Manifest } from "@prose-reader/shared"

export const areAllItemsPrePaginated = (manifest: Manifest | undefined) =>
  !manifest?.spineItems.some((item) => item.renditionLayout === `reflowable`)
