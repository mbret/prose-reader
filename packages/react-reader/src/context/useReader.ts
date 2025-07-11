import type { Reader } from "@prose-reader/core"
import type { AnnotationsEnhancerAPI } from "@prose-reader/enhancer-annotations"
import type { GalleryEnhancerAPI } from "@prose-reader/enhancer-gallery"
import type { RefitEnhancerAPI } from "@prose-reader/enhancer-refit"
import type { SearchEnhancerAPI } from "@prose-reader/enhancer-search"
import { useReaderContext } from "./useReaderContext"

export const useReader = () => {
  const { reader } = useReaderContext()

  return reader
}

export const hasSearchEnhancer = (
  reader?: Reader,
): reader is Reader & SearchEnhancerAPI => {
  return !!reader && "__PROSE_READER_ENHANCER_SEARCH" in reader
}

export const hasAnnotationsEnhancer = (
  reader?: Reader,
): reader is Reader & AnnotationsEnhancerAPI => {
  return !!reader && "__PROSE_READER_ENHANCER_ANNOTATIONS" in reader
}

export const hasGalleryEnhancer = (
  reader?: Reader,
): reader is Reader & GalleryEnhancerAPI => {
  return !!reader && "__PROSE_READER_ENHANCER_GALLERY" in reader
}

export const hasRefitEnhancer = (
  reader?: Reader,
): reader is Reader & RefitEnhancerAPI => {
  return !!reader && "__PROSE_READER_ENHANCER_REFIT" in reader
}
