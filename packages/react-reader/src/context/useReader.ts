import type { Reader } from "@prose-reader/core"
import type { AnnotationsEnhancerAPI } from "@prose-reader/enhancer-annotations"
import type { BookmarksEnhancerAPI } from "@prose-reader/enhancer-bookmarks"
import type { GalleryEnhancerAPI } from "@prose-reader/enhancer-gallery"
import type { SearchEnhancerAPI } from "@prose-reader/enhancer-search"
import { useContext } from "react"
import { ReaderContext } from "./context"

export const useReader = (): Reader | undefined => {
  const { reader } = useContext(ReaderContext)

  return reader
}

export const hasSearchEnhancer = (
  reader?: Reader,
): reader is Reader & SearchEnhancerAPI => {
  return !!reader && "__PROSE_READER_ENHANCER_SEARCH" in reader
}

export const hasBookmarksEnhancer = (
  reader?: Reader,
): reader is Reader & BookmarksEnhancerAPI => {
  return !!reader && "__PROSE_READER_ENHANCER_BOOKMARKS" in reader
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
