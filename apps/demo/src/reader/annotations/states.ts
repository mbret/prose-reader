import type { RuntimeAnnotation } from "@prose-reader/enhancer-annotations"
import { signal } from "reactjrx"

export const selectedHighlightSignal = signal<{
  highlight?: RuntimeAnnotation
  selection?: {
    selection: Selection
    itemIndex: number
  }
}>({
  key: `selectedHighlightSignal`,
  default: {},
})
