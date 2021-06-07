import { ComponentProps } from "react"
import { Reader as ReactReader } from "@oboku/reader-react";
import type { createBookmarksEnhancer } from "@oboku/reader-enhancer-bookmarks";
import { ReaderWithEnhancer } from "@oboku/reader";

type ReactReaderProps = ComponentProps<typeof ReactReader>

export type Manifest = NonNullable<ReactReaderProps['manifest']>

export type ReaderInstance = ReaderWithEnhancer<ReturnType<typeof createBookmarksEnhancer>>

declare global {
  interface Window {
    __OBOKU_READER_DEBUG?: boolean
  }
}