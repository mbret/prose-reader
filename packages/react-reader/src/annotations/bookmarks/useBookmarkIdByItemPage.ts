import { useObserve } from "reactjrx"
import { distinctUntilChanged, map, switchMap } from "rxjs"
import { useReaderWithAnnotations } from "../useReaderWithAnnotations.ts"

type PageBookmark = { id: string; cfi: string }

const isSamePageBookmarkList = (
  previous: PageBookmark[],
  next: PageBookmark[],
) =>
  previous.length === next.length &&
  previous.every(
    (bookmark, index) =>
      bookmark.id === next[index]?.id && bookmark.cfi === next[index]?.cfi,
  )

/**
 * The id of the bookmark of a page, by spine item index, then by page index
 * in the item.
 */
export type BookmarkIdByItemPage = ReadonlyMap<
  number,
  ReadonlyMap<number, string>
>

/**
 * The bookmarks of the annotations whose cfi is not a range. They are located
 * without loading any chapter, so a bookmark inside a reflowable chapter has a
 * page only while the chapter is loaded and laid out. A page is keyed in its
 * item, so an earlier item that changes its number of pages moves no marker.
 */
export const useBookmarkIdByItemPage = () => {
  const reader = useReaderWithAnnotations()

  return useObserve(
    () =>
      reader?.annotations.annotations$.pipe(
        map((annotations) =>
          annotations
            .filter(({ cfi }) => !reader.cfi.parseCfi(cfi).isCfiRange)
            .map(({ id, cfi }) => ({ id, cfi })),
        ),
        // A change of the selection, a color or a note moves no bookmark.
        distinctUntilChanged(isSamePageBookmarkList),
        switchMap((pageBookmarks) =>
          reader.locateResource(pageBookmarks, { mode: "shallow" }),
        ),
        map((locatedPageBookmarks): BookmarkIdByItemPage => {
          const bookmarkIdByItemPage = new Map<number, Map<number, string>>()

          for (const { resource, meta } of locatedPageBookmarks) {
            if (meta.itemPageIndex === undefined) continue

            const bookmarkIdByPage =
              bookmarkIdByItemPage.get(meta.itemIndex) ??
              new Map<number, string>()

            if (!bookmarkIdByPage.has(meta.itemPageIndex)) {
              bookmarkIdByPage.set(meta.itemPageIndex, resource.id)
            }

            bookmarkIdByItemPage.set(meta.itemIndex, bookmarkIdByPage)
          }

          return bookmarkIdByItemPage
        }),
      ),
    [reader],
  )
}
