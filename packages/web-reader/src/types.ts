import { Reader, ComposeEnhancer } from "@oboku/reader";
import { createBookmarksEnhancer } from "@oboku/reader-enhancer-bookmarks";
import { searchEnhancer } from "@oboku/reader-enhancer-search";
import { createHighlightsEnhancer } from "@oboku/reader-enhancer-highlights";

type AppEnhancer = ComposeEnhancer<typeof searchEnhancer, ReturnType<typeof createBookmarksEnhancer>, ReturnType<typeof createHighlightsEnhancer>>

export type ReaderInstance = Reader<AppEnhancer>

declare global {
  interface Window {
    __OBOKU_READER_DEBUG?: boolean
  }
}