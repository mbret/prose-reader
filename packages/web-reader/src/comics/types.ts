import type { createBookmarksEnhancer } from "@prose-reader/enhancer-bookmarks";
import { Reader } from "@prose-reader/core";

type Enhancer = ReturnType<typeof createBookmarksEnhancer>

export type ReaderInstance = Reader<Enhancer>