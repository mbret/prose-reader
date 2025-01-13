import type { Manifest } from "@prose-reader/shared"
import { getItemAnchor } from "./getItemAnchor"
import { CfiHandler } from "../CfiHandler"

export const generateCfi = (
  node: Node,
  offset: number,
  item: Manifest["spineItems"][number],
) => {
  // because the current cfi library does not works well with offset we are just using custom
  // format and do it manually after resolving the node
  // @see https://github.com/fread-ink/epub-cfi-resolver/issues/8
  const offsetAnchor = `[prose~offset~${offset || 0}]`

  return CfiHandler.generate(
    node,
    offset,
    `${getItemAnchor(item)}|${offsetAnchor}`,
  )
}
