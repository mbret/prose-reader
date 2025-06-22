import { hasAnnotationsEnhancer, useReader } from "../context/useReader"

export const useReaderWithAnnotations = () => {
  const reader = useReader()
  const readerWithBookmarks = hasAnnotationsEnhancer(reader)
    ? reader
    : undefined

  return readerWithBookmarks
}
