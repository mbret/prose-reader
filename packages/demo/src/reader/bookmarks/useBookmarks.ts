import { tap } from "rxjs/operators"
import { ReaderInstance } from "../../types"
import { useObserve } from "reactjrx"
import { NEVER } from "rxjs"
import { SerializableBookmark } from "@prose-reader/enhancer-bookmarks/dist/types"
import { useEffect, useState } from "react"

const restore = (bookKey: string) => {
  const storedBookmarks = JSON.parse(localStorage.getItem(`bookmarks`) || `{}`)
  const restored = storedBookmarks[bookKey] || ([] as SerializableBookmark[])

  return restored
}

const persist = (bookKey: string, bookmarks: SerializableBookmark[]) => {
  const existing = restore(bookKey)

  localStorage.setItem(
    `bookmarks`,
    JSON.stringify({
      ...existing,
      [bookKey]: bookmarks
    })
  )
}

export const useBookmarks = (reader: ReaderInstance | undefined, bookKey: string) => {
  const [isHydrated, setIsHydrated] = useState(false)

  useEffect(() => {
    if (!reader || isHydrated) return

    const restoredBookmarks = restore(bookKey)

    reader.bookmarks.addBookmarks(restoredBookmarks)

    setIsHydrated(true)
  }, [reader, isHydrated])

  useObserve(
    () =>
      reader && isHydrated
        ? reader.bookmarks.bookmarks$.pipe(
            tap((bookmarks) => {
              persist(bookKey, bookmarks)
            })
          )
        : NEVER,
    [reader, isHydrated]
  )
}
