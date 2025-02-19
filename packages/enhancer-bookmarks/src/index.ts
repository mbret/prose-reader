import type { Reader } from "@prose-reader/core"
import {
  BehaviorSubject,
  first,
  forkJoin,
  map,
  merge,
  of,
  share,
  switchMap,
  takeUntil,
  tap,
} from "rxjs"
import { Commands } from "./Commands"
import { report } from "./report"
import type {
  BookmarksEnhancerAPI,
  RuntimeBookmark,
  SerializableBookmark,
} from "./types"

export type { SerializableBookmark, RuntimeBookmark, BookmarksEnhancerAPI }

export const bookmarksEnhancer =
  <InheritOptions, InheritOutput extends Reader>(
    next: (options: InheritOptions) => InheritOutput,
  ) =>
  (options: InheritOptions): InheritOutput & BookmarksEnhancerAPI => {
    const reader = next(options)
    const bookmarksSubject = new BehaviorSubject<RuntimeBookmark[]>([])
    const commands = new Commands()

    const add$ = commands.add$.pipe(
      map(({ data }) => {
        const items = Array.isArray(data) ? data : [data]

        bookmarksSubject.next([...bookmarksSubject.value, ...items])
      }),
    )

    const delete$ = commands.delete$.pipe(
      tap(({ id }) => {
        bookmarksSubject.next(
          bookmarksSubject.value.filter((item) => item.id !== id),
        )
      }),
    )

    const bookmark$ = commands.bookmark$.pipe(
      map(({ absolutePageIndex }) => {
        const {
          // if we can't find a page index we just fallback to 0
          pageIndex = 0,
          spineItem,
        } =
          reader.spine.locator.getSpineInfoFromAbsolutePageIndex({
            absolutePageIndex,
          }) ?? {}

        if (!spineItem) return

        const cfi = reader.cfi.generateCfiForSpineItemPage({
          pageIndex,
          spineItem,
        })

        if (!bookmarksSubject.value.find((bookmark) => bookmark.cfi === cfi)) {
          bookmarksSubject.next([
            ...bookmarksSubject.value,
            { cfi, id: window.crypto.randomUUID() },
          ])
        }
      }),
    )

    const bookmarks$ = bookmarksSubject.asObservable()

    const pages$ = reader.spine.spineLayout.info$.pipe(
      switchMap(({ pages }) =>
        forkJoin(
          pages.map((page) => {
            const item = reader.spine.spineItemsManager.get(page.itemIndex)

            const isReady$ = item?.isReady$ ?? of(false)

            return isReady$.pipe(
              first(),
              map((isReady) => {
                return {
                  ...page,
                  isBookmarkable: isReady,
                }
              }),
            )
          }),
        ),
      ),
      share(),
    )

    merge(
      add$,
      delete$,
      bookmark$,
      bookmarks$.pipe(
        tap((bookmarks) => {
          report.debug("bookmarks", bookmarks)
        }),
      ),
    )
      .pipe(takeUntil(reader.$.destroy$))
      .subscribe()

    return {
      ...reader,
      __PROSE_READER_ENHANCER_BOOKMARKS: true,
      destroy: () => {
        commands.destroy()
        bookmarksSubject.complete()

        reader.destroy()
      },
      bookmarks: {
        bookmark: commands.bookmark,
        delete: commands.delete,
        add: commands.add,
        pages$,
        bookmarks$,
      },
    }
  }
