import { Reader, ComposeEnhancer } from "@prose-reader/core"
import { bookmarksEnhancer } from "@prose-reader/enhancer-bookmarks"
import { searchEnhancer } from "@prose-reader/enhancer-search"
import { createHighlightsEnhancer } from "@prose-reader/enhancer-highlights"
import { Props as ReactReaderGenericProps } from "@prose-reader/react"
import { hammerGestureEnhancer } from "@prose-reader/enhancer-hammer-gesture"

type AppEnhancer = ComposeEnhancer<
  typeof searchEnhancer,
  typeof bookmarksEnhancer,
  typeof hammerGestureEnhancer,
  ReturnType<typeof createHighlightsEnhancer>
>

export type ReaderInstance = Reader<AppEnhancer>

export type ReactReaderProps = ReactReaderGenericProps<AppEnhancer>

declare global {
  interface Window {
    __PROSE_READER_DEBUG?: boolean
  }
}
