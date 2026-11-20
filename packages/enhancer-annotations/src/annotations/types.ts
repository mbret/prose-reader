import type { Annotation } from "../types.ts"

export interface RuntimeAnnotation extends Annotation {
  itemIndex: number
  /**
   * A `"highlight"` covers a passage: its cfi is a range, and the enhancer
   * draws it. A `"bookmark"` marks a page: its cfi points to one place, such
   * as the first visible node of a page or the root of a spine item, and
   * nothing is drawn for it. Both can carry a note.
   */
  kind: "bookmark" | "highlight"
}
