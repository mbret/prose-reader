import type { AnnotationsEnhancerAPI } from "@prose-reader/enhancer-annotations"
import type { ReaderContextType } from "../context/context"
import { hasAnnotationsEnhancer, useReader } from "../context/useReader"

// Named and annotated for the same reason as `useReader`'s return type.
type ReaderWithAnnotations = NonNullable<ReaderContextType["reader"]> &
  AnnotationsEnhancerAPI

export const useReaderWithAnnotations = ():
  | ReaderWithAnnotations
  | undefined => {
  const reader = useReader()
  const readerWithBookmarks = hasAnnotationsEnhancer(reader)
    ? reader
    : undefined

  return readerWithBookmarks
}
