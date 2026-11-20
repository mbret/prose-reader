import { useObserve } from "reactjrx"
import { distinctUntilChanged, map } from "rxjs"
import { isBookmark } from "../isBookmark.ts"
import { useReaderWithAnnotations } from "../useReaderWithAnnotations.ts"

/**
 * The id of the bookmark of a page, by spine item index, then by page index
 * in the item.
 */
export type BookmarkIdByItemPage = ReadonlyMap<
  number,
  ReadonlyMap<number, string>
>

const isSameBookmarkIdByItemPage = (
  previous: BookmarkIdByItemPage,
  next: BookmarkIdByItemPage,
) =>
  previous.size === next.size &&
  Array.from(next).every(([itemIndex, bookmarkIdByPage]) => {
    const previousBookmarkIdByPage = previous.get(itemIndex)

    return (
      previousBookmarkIdByPage?.size === bookmarkIdByPage.size &&
      Array.from(bookmarkIdByPage).every(
        ([pageIndex, bookmarkId]) =>
          previousBookmarkIdByPage.get(pageIndex) === bookmarkId,
      )
    )
  })

/**
 * The first bookmark of each page, from the annotations of each page that
 * the annotations enhancer gives, which follow the rules of
 * `locateResource()`: a bookmark inside a reflowable chapter that is not
 * loaded has no page, unless its cfi names only its chapter.
 */
export const useBookmarkIdByItemPage = () => {
  const reader = useReaderWithAnnotations()

  return useObserve(
    () =>
      reader?.annotations.annotationsByItemPage$.pipe(
        map((annotationsByItemPage) => {
          const bookmarkIdByItemPage = new Map<number, Map<number, string>>()

          for (const [itemIndex, annotationsByPage] of annotationsByItemPage) {
            for (const [pageIndex, annotations] of annotationsByPage) {
              const bookmark = annotations.find((annotation) =>
                isBookmark(reader, annotation),
              )

              if (!bookmark) continue

              let bookmarkIdByPage = bookmarkIdByItemPage.get(itemIndex)

              if (!bookmarkIdByPage) {
                bookmarkIdByPage = new Map()
                bookmarkIdByItemPage.set(itemIndex, bookmarkIdByPage)
              }

              bookmarkIdByPage.set(pageIndex, bookmark.id)
            }
          }

          return bookmarkIdByItemPage
        }),
        // A change of a highlight, or of a note, moves no marker.
        distinctUntilChanged(isSameBookmarkIdByItemPage),
      ),
    [reader],
  )
}
