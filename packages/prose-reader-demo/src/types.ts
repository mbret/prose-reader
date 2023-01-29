import { bookmarksEnhancer } from "@prose-reader/enhancer-bookmarks"
import { searchEnhancer } from "@prose-reader/enhancer-search"
import { highlightsEnhancer } from "@prose-reader/enhancer-highlights"
import { hammerGestureEnhancer } from "@prose-reader/enhancer-hammer-gesture"
import { createReader } from "@prose-reader/core"
import { Props as GenericReactReaderProps } from "@prose-reader/react"

export const createAppReader = hammerGestureEnhancer(
  highlightsEnhancer(
    bookmarksEnhancer(
      searchEnhancer(
        // __
        createReader
      )
    )
  )
)

export type ReaderInstance = ReturnType<typeof createAppReader>

export type ReactReaderProps = GenericReactReaderProps<Parameters<typeof createAppReader>[0], ReturnType<typeof createAppReader>>

declare global {
  interface Window {
    __PROSE_READER_DEBUG?: boolean
  }
}
