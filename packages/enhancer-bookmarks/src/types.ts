import { LayoutPosition } from "@prose-reader/core/dist/spine/SpineLayout"
import { Observable } from "rxjs"

export type SerializableBookmark = {
  cfi: string
}

export type PageBookmark = {
  absolutePageIndex: number
}

export type RuntimeBookmark = {
  cfi: string
  itemIndex?: number
  pageIndex?: number
  absolutePageIndex?: number
  node?: Node
  offset?: number
}

export type EnhancerOutput = {
  bookmarks: {
    addBookmark: (params: { absolutePageIndex: number }) => void
    addBookmarks: (bookmarks: SerializableBookmark[]) => void
    removeBookmark: (params: { absolutePageIndex: number }) => void
    removeAllBookmarks: () => void
    bookmarks$: Observable<RuntimeBookmark[]>
    pages$: Observable<
      {
        isBookmarkable: boolean | undefined
        absolutePageIndex: number
        itemIndex: number
        absolutePosition: LayoutPosition
      }[]
    >
  }
}

export type Command =
  | { type: "add"; data: SerializableBookmark | PageBookmark }
  | { type: "removeAll" }
  | { type: "remove"; data: PageBookmark }
