import { Reader, Report } from "@prose-reader/core"
import {
  BehaviorSubject,
  fromEvent,
  ObservedValueOf,
  switchMap,
  Subject,
  EMPTY,
  Observable,
  merge,
  animationFrameScheduler,
} from "rxjs"
import { tap, map, takeUntil, withLatestFrom, filter, pairwise, startWith, mergeMap, share, debounceTime } from "rxjs/operators"
import { mapBookmarkToImportableBookmark, mapImportableBookmarkToBookmark } from "./bookmarks"
import { createRenderer } from "./renderer"
import { Bookmark, ImportableBookmark } from "./types"

const PACKAGE_NAME = `@prose-reader/enhancer-bookmarks`

const logger = Report.namespace(PACKAGE_NAME)

export const bookmarksEnhancer =
  <InheritOptions, InheritOutput extends Reader>(next: (options: InheritOptions) => InheritOutput) =>
  (
    options: InheritOptions,
  ): InheritOutput & {
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
  } => {
    const reader = next(options)
    const bookmarksSubject$ = new BehaviorSubject<Bookmark[]>([])
    const bookmarks$ = bookmarksSubject$.pipe(
      startWith(undefined),
      pairwise(),
      filter(([old, current]) => !!current && !(old && old.length === 0 && current.length === 0)),
      map(([, bookmarks = []]) => bookmarks),
      share(),
    )
    const loadedSubject$ = new Subject<void>()
    const settings = {
      areaWidth: 50,
      areaHeight: 30,
    }
    const renderer = createRenderer(reader, settings)

    const getCfiInformation = (cfi: string) => {
      const { node, offset = 0, spineItemIndex } = reader.resolveCfi(cfi) || {}

      if (node && spineItemIndex !== undefined) {
        const pageIndex = reader.locator.getSpineItemPageIndexFromNode(node, offset, spineItemIndex)

        return { cfi, pageIndex, spineItemIndex }
      }

      return { cfi, pageIndex: undefined, spineItemIndex }
    }

    const createBookmarkFromCurrentPagination = ({ beginCfi }: ObservedValueOf<Reader[`pagination$`]>) => {
      if (beginCfi) {
        return getCfiInformation(beginCfi)
      }

      return undefined
    }

    /**
     * Bookmark area is top right corner
     */
    const isClickEventInsideBookmarkArea = (e: MouseEvent | PointerEvent) => {
      const event = reader.normalizeEventForViewport(e)

      const { width } = reader.context.getVisibleAreaRect()

      if ((event.x || 0) >= width - settings.areaWidth && (event.y || 0) <= settings.areaHeight) {
        return true
      }

      return false
    }

    const onDocumentClick = (e: MouseEvent, pagination: ObservedValueOf<Reader[`pagination$`]>) => {
      if (isClickEventInsideBookmarkArea(e)) {
        const newBookmark = createBookmarkFromCurrentPagination(pagination)

        if (!newBookmark) {
          logger.warn(
            `Unable to retrieve cfi for bookmark. You might want to wait for the chapter to be ready before letting user create bookmark`,
          )
          return
        }

        if (bookmarksSubject$.value.find(({ cfi }) => newBookmark.cfi === cfi)) {
          logger.warn(`A bookmark for this cfi already exist, skipping process!`)
          return
        }

        e.stopPropagation()
        e.preventDefault()

        bookmarksSubject$.next([...bookmarksSubject$.value, newBookmark])

        logger.log(`added new bookmark`, newBookmark)
      }
    }

    const load = (bookmarks: ImportableBookmark[]) => {
      bookmarksSubject$.next(bookmarks.map(mapImportableBookmarkToBookmark))

      loadedSubject$.next()
    }

    const createClickListener$ = (frameOrElement: HTMLIFrameElement | HTMLElement) => {
      const windowOrElement = `contentWindow` in frameOrElement ? frameOrElement.contentWindow : frameOrElement

      if (windowOrElement) {
        return fromEvent(windowOrElement, `click`, { capture: true }).pipe(
          withLatestFrom(reader.pagination$),
          tap(([e, pagination]) => onDocumentClick(e as MouseEvent, pagination)),
        )
      }

      return undefined
    }

    // @todo handle spread
    const removeBookmarksOnCurrentPage = <T>(observer: Observable<T>) =>
      observer.pipe(
        withLatestFrom(reader.pagination$),
        tap(([, pagination]) => {
          if (pagination.beginSpineItemIndex !== undefined) {
            bookmarksSubject$.next(
              bookmarksSubject$.value.filter((bookmark) => bookmark.spineItemIndex !== pagination.beginSpineItemIndex),
            )
          }
        }),
      )

    const removeAll = () => {
      bookmarksSubject$.next([])
    }

    const mapToImportable = (bookmarks: Bookmark[]) => bookmarks.map(mapBookmarkToImportableBookmark)

    /**
     * For each item we register the container to be clickable to add a new bookmark.
     * This way it works even if the item is not loaded. It will be relative to first page
     * anyway.
     */
    reader.spineItems$
      .pipe(
        switchMap((items) => merge(items.map(({ element }) => createClickListener$(element)))),
        takeUntil(reader.$.destroy$),
      )
      .subscribe()

    /**
     * For each item frame we register even on click to be able to click within
     * the frame
     */
    reader.registerHook(`item.onLoad`, ({ frame }) => createClickListener$(frame))

    renderer.$.element$
      .pipe(
        switchMap((element) => {
          if (!element) return EMPTY

          return fromEvent(element, `click`).pipe(removeBookmarksOnCurrentPage)
        }),
        takeUntil(reader.$.destroy$),
      )
      .subscribe()

    merge(
      bookmarks$,
      reader.pagination$,
      // It's important to force redraw and update bookmarkd on each layout
      // this is because pagination itself is not always garanteed to be updated
      // when the frame actually exists
      reader.$.layout$.pipe(
        withLatestFrom(bookmarksSubject$),
        map(([, bookmarks]) =>
          bookmarks.map((bookmark) => {
            const { pageIndex, spineItemIndex } = getCfiInformation(bookmark.cfi)

            return {
              ...bookmark,
              pageIndex,
              spineItemIndex,
            }
          }),
        ),
        mergeMap((newBookmarks) => {
          // @todo optimize and not call next if bookmarks are the same
          bookmarksSubject$.next(newBookmarks)

          // Because we did not optimized above yet, the subject is always updated
          // so we don't need to continue this and force a redraw
          return EMPTY
        }),
      ),
    )
      .pipe(
        // since we trigger redraw from many scenario this is a good batch optimisation
        debounceTime(100, animationFrameScheduler),
        withLatestFrom(bookmarks$),
        switchMap(([, bookmarks]) => renderer.redrawBookmarks$(bookmarks)),
        takeUntil(reader.$.destroy$),
      )
      .subscribe()

    return {
      ...reader,
      bookmarks: {
        removeAll,
        isClickEventInsideBookmarkArea,
        mapToImportable,
        load,
        $: {
          loaded$: loadedSubject$.asObservable(),
          bookmarks$,
        },
      },
    }
  }
