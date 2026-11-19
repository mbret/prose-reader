import type { AnnotationsEnhancerAPI } from "@prose-reader/enhancer-annotations"
import type { ReactReaderReader } from "../context/context.ts"
import { hasAnnotationsEnhancer, useReader } from "../context/useReader.ts"

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
