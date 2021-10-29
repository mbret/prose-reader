import type { createBookmarksEnhancer } from "@oboku/reader-enhancer-bookmarks";
import { Reader } from "@oboku/reader";

type Enhancer = ReturnType<typeof createBookmarksEnhancer>

export type ReaderInstance = Reader<Enhancer>