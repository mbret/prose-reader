import type { CbzEnhancerAPI } from "@prose-reader/cbz"
import type { Reader } from "@prose-reader/core"
import type { AnnotationsEnhancerAPI } from "@prose-reader/enhancer-annotations"
import type { AudioEnhancerAPI } from "@prose-reader/enhancer-audio"
import type { GalleryEnhancerAPI } from "@prose-reader/enhancer-gallery"
import type { RefitEnhancerAPI } from "@prose-reader/enhancer-refit"
import type { SearchEnhancerAPI } from "@prose-reader/enhancer-search"
import type { ReaderContextType } from "./context"
import { useReaderContextValue } from "./useReaderContext"

// Annotated rather than inferred: an enhanced reader is a large enough type
// that declaration emit gives up serialising the inferred one (TS7056), and
// every `.d.ts` mentioning it would otherwise re-expand it in full. Indexing
// the context keeps this hook in step with what the provider actually holds.
export const useReader = (): ReaderContextType["reader"] => {
  const { reader } = useReaderContextValue(["reader"])

  return reader
}

export const hasSearchEnhancer = (
  reader?: Reader,
): reader is Reader & SearchEnhancerAPI => {
  return !!reader && "__PROSE_READER_ENHANCER_SEARCH" in reader
}

export const hasAudioEnhancer = (
  reader?: Reader,
): reader is Reader & AudioEnhancerAPI => {
  return !!reader && "__PROSE_READER_ENHANCER_AUDIO" in reader
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

export const hasCbzEnhancer = (
  reader?: Reader,
): reader is Reader & CbzEnhancerAPI => {
  return !!reader && "__PROSE_READER_ENHANCER_CBZ" in reader
}
