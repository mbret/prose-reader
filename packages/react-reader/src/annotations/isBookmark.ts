import type { Reader } from "@prose-reader/core"
import type { Annotation } from "@prose-reader/enhancer-annotations"

/**
 * A bookmark is anchored to a page, not to a passage within it: its cfi is not
 * a range. It can carry a note. Any other annotation is a highlight.
 */
export const isBookmark = (reader: Reader, annotation: Annotation) =>
  !reader.cfi.parseCfi(annotation.cfi).isCfiRange
