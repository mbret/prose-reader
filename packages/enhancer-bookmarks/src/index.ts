import { Reader, waitForSwitch } from "@prose-reader/core"
import { animationFrameScheduler, BehaviorSubject, combineLatest, merge, of, Subject, timer } from "rxjs"
import { filter, map, share, switchMap, takeUntil, tap, withLatestFrom } from "rxjs/operators"
import { SerializableBookmark, EnhancerOutput, RuntimeBookmark, Command } from "./types"
import { consolidateBookmark } from "./bookmarks/consolidateBookmark"
import { report } from "./report"

export { type SerializableBookmark, type RuntimeBookmark }

export const bookmarksEnhancer =
  <InheritOptions, InheritOutput extends Reader>(next: (options: InheritOptions) => InheritOutput) =>
  (options: InheritOptions): InheritOutput & EnhancerOutput => {
    const reader = next(options)
    const commandSubject = new Subject<Command>()
    const bookmarksSubject = new BehaviorSubject<RuntimeBookmark[]>([])

    const addBookmarks = (bookmarks: SerializableBookmark[]) => {
      bookmarks.forEach((bookmark) => {
        commandSubject.next({ data: bookmark, type: "add" })
      })
    }

    const addBookmark = (data: { absolutePageIndex: number }) => {
      commandSubject.next({ data, type: "add" })
    }

    const removeAllBookmarks = () => {
      commandSubject.next({ type: "removeAll" })
    }

    const removeBookmark = (data: { absolutePageIndex: number }) => {
      commandSubject.next({ type: "remove", data })
    }

    const pages$ = reader.spine.spineLayout.info$.pipe(
      switchMap(({ pages }) =>
        combineLatest(
          pages.map((page) => {
            const item = reader.spine.spineItemsManager.get(page.itemIndex)

            const isReady$ = item ? item.isReady$ : of(false)

            return isReady$.pipe(
              map((isReady) => ({
                ...page,
                isBookmarkable: isReady,
              })),
            )
          }),
        ),
      ),
    )

    const removeBookmark$ = commandSubject.pipe(
      filter((command) => command.type === "remove"),
      withLatestFrom(bookmarksSubject),
      tap(
        ([
          {
            data: { absolutePageIndex },
          },
          bookmarks,
        ]) => {
          const existingBookmark = bookmarks.find((bookmark) => bookmark.absolutePageIndex === absolutePageIndex)

          if (existingBookmark) {
            bookmarksSubject.next(bookmarks.filter((bookmark) => bookmark !== existingBookmark))
          }
        },
      ),
    )

    const removeAll$ = commandSubject.pipe(
      filter((command) => command.type === "removeAll"),
      tap(() => {
        bookmarksSubject.next([])
      }),
    )

    /**
     * @todo optimize to generate CFI only on viewport free
     */
    const addBookmark$ = commandSubject.pipe(
      filter((command) => command.type === "add"),
      withLatestFrom(bookmarksSubject),
      map(([command, bookmarks]) => {
        report.debug("addBookmark", { command, bookmarks })

        const givenCfi = "cfi" in command.data ? command.data.cfi : undefined
        const givenAbsolutePageIndex = "absolutePageIndex" in command.data ? command.data.absolutePageIndex : undefined

        if (givenCfi) {
          if (!bookmarks.find((bookmark) => bookmark.cfi === givenCfi)) {
            bookmarksSubject.next([...bookmarks, { cfi: givenCfi }])
          }

          return
        }

        if (givenAbsolutePageIndex !== undefined) {
          const { pageIndex, spineItem } =
            reader.spine.locator.getSpineInfoFromAbsolutePageIndex({ absolutePageIndex: givenAbsolutePageIndex }) ?? {}

          if (pageIndex === undefined || !spineItem) return undefined

          const cfi = reader.cfi.generateCfiForSpineItemPage({
            pageIndex,
            spineItem,
          })

          if (bookmarks.find((bookmark) => bookmark.cfi === cfi)) {
            report.debug(`Bookmark for cfi ${cfi} already exists`)

            return
          }

          bookmarksSubject.next([...bookmarks, { cfi }])
        }
      }),
      share(),
    )

    /**
     * @todo optimize to only consolidate when needed
     */
    const consolidateBookmarksOnLayout$ = merge(addBookmark$, reader.layout$).pipe(
      switchMap(() =>
        timer(100, animationFrameScheduler).pipe(
          waitForSwitch(reader.context.bridgeEvent.viewportFree$),
          withLatestFrom(bookmarksSubject),
          tap(([, bookmarks]) => {
            bookmarksSubject.next(bookmarks.map((bookmark) => consolidateBookmark({ bookmark, reader })))
          }),
          takeUntil(commandSubject),
        ),
      ),
    )

    const bookmarks$ = bookmarksSubject.asObservable()

    merge(
      addBookmark$,
      removeBookmark$,
      removeAll$,
      consolidateBookmarksOnLayout$,
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
      destroy: () => {
        bookmarksSubject.complete()

        reader.destroy()
      },
      bookmarks: {
        removeAllBookmarks,
        addBookmarks,
        removeBookmark,
        pages$,
        bookmarks$,
        addBookmark,
      },
    }
  }
