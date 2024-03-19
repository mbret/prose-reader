import { useEffect } from "react"
import { tap, switchMap } from "rxjs/operators"
import { Report } from "./report"
import { ReaderInstance } from "./types"

type Bookmark = Parameters<ReaderInstance[`bookmarks`][`load`]>[0][number]

export const useBookmarks = (reader: ReaderInstance | undefined, bookKey: string) => {
  // synchronize the bookmarks with the local storage
  useEffect(() => {
    if (reader) {
      const bookmarksSubscription = reader.bookmarks.$.loaded$
        .pipe(
          switchMap(() =>
            reader.bookmarks.$.bookmarks$.pipe(
              tap((bookmarks) => {
                const importableBookmarks = reader.bookmarks.mapToImportable(bookmarks)
                persist(bookKey, importableBookmarks)

                Report.log(`persisted bookmarks`, importableBookmarks)
              })
            )
          )
        )
        .subscribe()

      return () => {
        bookmarksSubscription?.unsubscribe()
      }
    }
  }, [reader, bookKey])

  /**
   * Load existing persisted bookmarks
   */
  useEffect(() => {
    const bookmarksForBook = restore(bookKey)

    Report.log(`restored bookmarks`, bookmarksForBook)

    reader?.bookmarks.load(bookmarksForBook)
  }, [reader, bookKey])
}

const restore = (bookKey: string) => {
  const storedBookmarks = JSON.parse(localStorage.getItem(`bookmarks`) || `{}`)
  const restored = storedBookmarks[bookKey] || ([] as Bookmark[])

  return restored
}

const persist = (bookKey: string, bookmarks: Bookmark[]) => {
  const existing = restore(bookKey)

  localStorage.setItem(
    `bookmarks`,
    JSON.stringify({
      ...existing,
      [bookKey]: bookmarks
    })
  )
}
