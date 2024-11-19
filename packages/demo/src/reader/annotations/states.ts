import { Highlight } from "@prose-reader/enhancer-annotations"
import { signal } from "reactjrx"

export const selectedHighlightSignal = signal<{
  highlight?: Highlight
  selection?: {
    document: Document
    selection: Selection
    itemId: string
  }
}>({
  key: `selectedHighlightSignal`,
  default: {}
})
