import type { createBookmarksEnhancer } from "@oboku/reader-enhancer-bookmarks";
import { ReaderWithEnhancer } from "@oboku/reader";

export type ReaderInstance = ReaderWithEnhancer<ReturnType<typeof createBookmarksEnhancer>>