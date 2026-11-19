import type { Reader } from "@prose-reader/core"
import type { Annotation } from "@prose-reader/enhancer-annotations"

/**
 * A bookmark is an annotation whose cfi is not a range: it marks a place, not
 * a passage. Any other annotation is a highlight. A note changes neither.
 */
export const isBookmark = (reader: Reader, annotation: Annotation) =>
  !reader.cfi.parseCfi(annotation.cfi).isCfiRange
