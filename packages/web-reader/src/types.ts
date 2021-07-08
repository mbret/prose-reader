import type { createBookmarksEnhancer } from "@oboku/reader-enhancer-bookmarks";
import type { searchEnhancer } from "@oboku/reader-enhancer-search";
import { ReaderWithEnhancer } from "@oboku/reader";
import { createHighlightsEnhancer } from "../../enhancer-highlights/src";
import { ComposeEnhancer } from "@oboku/reader/dist/utils/composeEnhancer";

export type ReaderInstance = ReaderWithEnhancer<ComposeEnhancer<typeof searchEnhancer, ReturnType<typeof createBookmarksEnhancer>, ReturnType<typeof createHighlightsEnhancer>>>

declare global {
  interface Window {
    __OBOKU_READER_DEBUG?: boolean
  }
}