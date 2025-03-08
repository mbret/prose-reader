import type { ProseHighlight } from "@prose-reader/enhancer-annotations"
import { signal } from "reactjrx"

export const selectedHighlightSignal = signal<{
  highlight?: ProseHighlight
  selection?: {
    selection: Selection
    itemIndex: number
  }
}>({
  key: `selectedHighlightSignal`,
  default: {},
})
