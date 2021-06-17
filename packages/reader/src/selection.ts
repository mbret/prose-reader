import { CFI } from "./cfi"
import { Manifest } from "./types"

export const createSelection = (selection: Selection, item: Manifest['readingOrder'][number]) => {
  const text = selection.toString()

  return {
    toString: () => text,
    getAnchorCfi: () => {
      if (selection.anchorNode) {
        return CFI.generate(selection.anchorNode, selection.anchorOffset, `|[oboku~anchor~${encodeURIComponent(item.id)}]`)
      }
    },
    getFocusCfi: () => {
      if (selection.focusNode) {
        return CFI.generate(selection.focusNode, selection.focusOffset, `|[oboku~anchor~${encodeURIComponent(item.id)}]`)
      }
    }
  }
}