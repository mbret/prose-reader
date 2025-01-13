import type { Manifest } from "@prose-reader/shared"

export const getItemAnchor = (item: Manifest["spineItems"][number]) =>
  `|[prose~anchor~${encodeURIComponent(item.index)}]`
