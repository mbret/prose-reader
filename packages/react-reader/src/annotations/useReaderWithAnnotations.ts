import type { AnnotationsEnhancerAPI } from "@prose-reader/enhancer-annotations"
import type { ReactReaderReader } from "../context/context"
import { hasAnnotationsEnhancer, useReader } from "../context/useReader"

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
