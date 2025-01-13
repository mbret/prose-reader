import type { Highlight } from "@prose-reader/enhancer-annotations"
import { signal } from "reactjrx"

export const selectedHighlightSignal = signal<{
  highlight?: Highlight
  selection?: {
    selection: Selection
    itemIndex: number
  }
}>({
  key: `selectedHighlightSignal`,
  default: {},
})
