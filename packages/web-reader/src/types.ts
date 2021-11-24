import { Reader, ComposeEnhancer } from "@prose-reader/core";
import { createBookmarksEnhancer } from "@prose-reader/enhancer-bookmarks";
import { searchEnhancer } from "@prose-reader/enhancer-search";
import { createHighlightsEnhancer } from "@prose-reader/enhancer-highlights";

type AppEnhancer = ComposeEnhancer<
  typeof searchEnhancer,
  ReturnType<typeof createBookmarksEnhancer>,
  ReturnType<typeof createHighlightsEnhancer>
>

export type ReaderInstance = Reader<AppEnhancer>

declare global {
  interface Window {
    __PROSE_READER_DEBUG?: boolean
  }
}