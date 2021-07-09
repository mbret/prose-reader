import { ReaderWithEnhancer } from "@oboku/reader";
import { createBookmarksEnhancer } from "@oboku/reader-enhancer-bookmarks";
import { searchEnhancer } from "@oboku/reader-enhancer-search";
import { createHighlightsEnhancer } from "@oboku/reader-enhancer-highlights";
import { ComposeEnhancer } from "@oboku/reader/dist/utils/composeEnhancer";

export type ReaderInstance = ReaderWithEnhancer<ComposeEnhancer<typeof searchEnhancer, ReturnType<typeof createBookmarksEnhancer>, ReturnType<typeof createHighlightsEnhancer>>>

declare global {
  interface Window {
    __OBOKU_READER_DEBUG?: boolean
  }
}