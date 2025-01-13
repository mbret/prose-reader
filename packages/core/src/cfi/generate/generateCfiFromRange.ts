import type { Manifest } from "@prose-reader/shared"
import { generateCfi } from "./generateCfi"

/**
 * @todo the package does not support creating for range at the moment @see https://github.com/fread-ink/epub-cfi-resolver/issues/3
 * so we use two cfi for start and end.
 */
export const generateCfiFromRange = (
  range: Range,
  item: Manifest[`spineItems`][number],
) => {
  const startCFI = generateCfi(range.startContainer, range.startOffset, item)
  const endCFI = generateCfi(range.endContainer, range.endOffset, item)

  return { start: startCFI, end: endCFI }
}
