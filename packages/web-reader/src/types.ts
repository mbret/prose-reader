import type { createBookmarksEnhancer } from "@oboku/reader-enhancer-bookmarks";
import { ReaderWithEnhancer } from "@oboku/reader";

export type ReaderInstance = ReaderWithEnhancer<ReturnType<typeof createBookmarksEnhancer>>

declare global {
  interface Window {
    __OBOKU_READER_DEBUG?: boolean
  }
}