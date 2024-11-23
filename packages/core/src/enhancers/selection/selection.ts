import { Manifest } from "@prose-reader/shared"
import { generateCfi } from "../../cfi/generate/generateCfi"

export const generateCfis = ({
  item,
  selection,
}: {
  selection: Selection
  item: Manifest["spineItems"][number]
}) => {
  const anchorCfi = selection.anchorNode
    ? generateCfi(selection.anchorNode, selection.anchorOffset, item)
    : undefined

  const focusCfi = selection.focusNode
    ? generateCfi(selection.focusNode, selection.focusOffset, item)
    : undefined

  return {
    anchorCfi,
    focusCfi,
  }
}
