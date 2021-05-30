import { useEffect, useState } from "react";
import { filter, tap } from "rxjs/operators";
import { createBookmarksEnhancer } from "@oboku/reader-enhancer-bookmarks";
import { ReaderInstance } from "./types";

export const useBookmarks = (reader: ReaderInstance | undefined) => {
  const [enhancer, setEnhancer] = useState<ReturnType<typeof createBookmarksEnhancer> | undefined>(undefined)

  // synchronize the bookmarks with the local storage
  useEffect(() => {
    const bookmarksSubscription = reader?.bookmarks$
      .pipe(
        filter(event => event.type === `update`),
        tap(event => {
          localStorage.setItem(`bookmarks`, JSON.stringify(event.data))
        })
      )
      .subscribe()

    return () => {
      bookmarksSubscription?.unsubscribe()
    }
  }, [reader])

  // create bookmarks enhancer and initialize with local storage bookmarks
  useEffect(() => {
    const storedBookmarks = JSON.parse(localStorage.getItem(`bookmarks`) || `[]`)

    const bookmarksEnhancer = createBookmarksEnhancer({ bookmarks: storedBookmarks })

    setEnhancer(() => bookmarksEnhancer)
  }, [])

  return enhancer
}
