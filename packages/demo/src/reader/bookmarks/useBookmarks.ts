import { skip, tap } from "rxjs"
import { useObserve } from "reactjrx"
import { NEVER } from "rxjs"
import { SerializableBookmark } from "@prose-reader/enhancer-bookmarks"
import { useEffect, useState } from "react"
import { ReaderInstance } from "../useCreateReader"

const restore = (bookKey: string) => {
  const storedBookmarks = JSON.parse(localStorage.getItem(`bookmarks`) || `{}`)
  const restored = storedBookmarks[bookKey] || ([] as SerializableBookmark[])

  return restored
}

const persist = (bookKey: string, bookmarks: SerializableBookmark[]) => {
  const existing = JSON.parse(localStorage.getItem(`bookmarks`) || `{}`)

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

    reader.bookmarks.add(restoredBookmarks)

    setIsHydrated(true)
  }, [reader, isHydrated])

  useObserve(
    () =>
      reader && isHydrated
        ? reader.bookmarks.bookmarks$.pipe(
            skip(1),
            tap((bookmarks) => {
              persist(bookKey, bookmarks)
            })
          )
        : NEVER,
    [reader, isHydrated, bookKey]
  )
}
