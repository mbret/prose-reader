import type { createBookmarksEnhancer } from "@oboku/reader-enhancer-bookmarks";
import type { searchEnhancer } from "@oboku/reader-enhancer-search";
import { ReaderWithEnhancer } from "@oboku/reader";
import { ComposeEnhancer } from "@oboku/reader/dist/utils/composeEnhancer";

export type ReaderInstance = ReaderWithEnhancer<ComposeEnhancer<ReturnType<typeof createBookmarksEnhancer>, typeof searchEnhancer>>