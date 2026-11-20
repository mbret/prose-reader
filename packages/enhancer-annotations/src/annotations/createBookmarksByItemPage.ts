import type { Reader } from "@prose-reader/core"
import { isShallowEqual } from "@prose-reader/shared"
import {
  distinctUntilChanged,
  map,
  type Observable,
  shareReplay,
  switchMap,
  takeUntil,
} from "rxjs"
import type { BookmarksByItemPage } from "../types.ts"
import type { RuntimeAnnotation } from "./types.ts"

const isSameBookmarkList = (
  previous: RuntimeAnnotation[],
  next: RuntimeAnnotation[],
) =>
  previous.length === next.length &&
  previous.every((annotation, index) => isShallowEqual(annotation, next[index]))

const isSameBookmarksByItemPage = (
  previous: BookmarksByItemPage,
  next: BookmarksByItemPage,
) =>
  previous.size === next.size &&
  Array.from(next).every(([itemIndex, bookmarksByPage]) => {
    const previousBookmarksByPage = previous.get(itemIndex)

    return (
      previousBookmarksByPage?.size === bookmarksByPage.size &&
      Array.from(bookmarksByPage).every(([pageIndex, bookmarks]) => {
        const previousBookmarks = previousBookmarksByPage.get(pageIndex)

        return (
          previousBookmarks?.length === bookmarks.length &&
          bookmarks.every(
            (bookmark, index) => bookmark === previousBookmarks[index],
          )
        )
      })
    )
  })

/**
 * `bookmarksByItemPage$`, as `AnnotationsEnhancerAPI` documents it. A list in
 * which no bookmark changed, as when a highlight is selected, locates nothing.
 */
export const createBookmarksByItemPage$ = (
  reader: Reader,
  annotations$: Observable<RuntimeAnnotation[]>,
): Observable<BookmarksByItemPage> =>
  annotations$.pipe(
    map((annotations) => annotations.filter(({ kind }) => kind === "bookmark")),
    distinctUntilChanged(isSameBookmarkList),
    switchMap((bookmarks) =>
      reader.locateResource(bookmarks, { mode: "shallow" }),
    ),
    map((locatedBookmarks) => {
      const bookmarksByItemPage = new Map<
        number,
        Map<number, RuntimeAnnotation[]>
      >()

      for (const { resource, meta } of locatedBookmarks) {
        if (meta.itemPageIndex === undefined) continue

        let bookmarksByPage = bookmarksByItemPage.get(meta.itemIndex)

        if (!bookmarksByPage) {
          bookmarksByPage = new Map()
          bookmarksByItemPage.set(meta.itemIndex, bookmarksByPage)
        }

        const bookmarksOfPage = bookmarksByPage.get(meta.itemPageIndex)

        if (bookmarksOfPage) {
          bookmarksOfPage.push(resource)
        } else {
          bookmarksByPage.set(meta.itemPageIndex, [resource])
        }
      }

      return bookmarksByItemPage
    }),
    // A relocation that moves no bookmark emits nothing.
    distinctUntilChanged(isSameBookmarksByItemPage),
    takeUntil(reader.$.destroy$),
    shareReplay({ refCount: true, bufferSize: 1 }),
  )
