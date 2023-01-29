import { Reader } from "@prose-reader/core"
import { Observable } from "rxjs"

export type Bookmark = {
  cfi: string
  pageIndex: number | undefined
  spineItemIndex: number | undefined
}

export type Api = {
  bookmarks: {
    isClickEventInsideBookmarkArea: (e: PointerEvent | MouseEvent) => boolean
    load: (bookmarks: ImportableBookmark[]) => void
    removeAll: () => void
    mapToImportable: (bookmarks: Bookmark[]) => ImportableBookmark[]
    $: {
      bookmarks$: Observable<Bookmark[]>
      loaded$: Observable<void>
    }
  }
}

export type ImportableBookmark = Pick<Bookmark, `cfi`>

export type ReaderInstance = Reader & Api
