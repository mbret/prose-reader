import type { AnnotationsEnhancerAPI } from "@prose-reader/enhancer-annotations"
import type { ReactReaderReader } from "../context/context"
import { hasAnnotationsEnhancer, useReader } from "../context/useReader"

// Annotated rather than inferred: declaration emit gives up serialising an
// inferred enhanced reader (TS7056).
type ReaderWithAnnotations = ReactReaderReader & AnnotationsEnhancerAPI

export const useReaderWithAnnotations = ():
  | ReaderWithAnnotations
  | undefined => {
  const reader = useReader()
  const readerWithBookmarks = hasAnnotationsEnhancer(reader)
    ? reader
    : undefined

  return readerWithBookmarks
}
