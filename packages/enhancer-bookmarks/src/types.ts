import type { Reader } from "@prose-reader/core"
import type { Observable, ObservedValueOf } from "rxjs"
import type { Commands } from "./Commands"

export type SerializableBookmark = {
  cfi: string
  id: string
}

export type RuntimeBookmark = SerializableBookmark

export type BookmarksEnhancerAPI = {
  readonly __PROSE_READER_ENHANCER_BOOKMARKS: boolean
  bookmarks: {
    bookmark: Commands["bookmark"]
    delete: Commands["delete"]
    add: Commands["add"]
    bookmarks$: Observable<RuntimeBookmark[]>
    /**
     * Make it conveniant for users to observes pages with bookmarkable status.
     */
    pages$: Observable<
      (ObservedValueOf<Reader["layoutInfo$"]>["pages"][number] & {
        isBookmarkable: boolean | undefined
      })[]
    >
  }
}
