import { Enhancer, Report } from '@oboku/reader'
import { Observable, Subject } from 'rxjs'
import { filter, tap } from 'rxjs/operators'
import { getIcon } from './icon'

const PACKAGE_NAME = `@oboku/reader-enhancer-bookmarks`
const ELEMENT_ID = PACKAGE_NAME
const logger = Report.namespace(PACKAGE_NAME)

type Bookmark = {
  cfi: string,
  pageIndex: number | undefined,
  readingItemIndex: number | undefined
}

type ExportableBookmark = Pick<Bookmark, 'cfi'>

type SubjectType = { type: `update`, data: ExportableBookmark[] }

export const createBookmarksEnhancer = ({ bookmarks: initialBookmarks }: { bookmarks: ExportableBookmark[] }): Enhancer<{
  bookmarks: {
    isClickEventInsideBookmarkArea: (e: PointerEvent | MouseEvent) => boolean
  },
  bookmarks$: Observable<SubjectType>
}> =>
  next => options => {
    const reader = next(options)
    let bookmarks: Bookmark[] = initialBookmarks.map(incompleteBookmark => ({ ...incompleteBookmark, pageIndex: undefined, readingItemIndex: undefined }))
    const subject = new Subject<SubjectType>()
    const settings = {
      areaWidth: 50,
      areaHeight: 30,
    }

    const createBookmarkFromCurrentPagination = () => {
      const cfi = reader.pagination.getBeginInfo().cfi

      if (cfi) {
        const { pageIndex, readingItemIndex } = reader.getCfiInformation(cfi) || {}

        return { cfi, pageIndex, readingItemIndex }
      }

      return undefined
    }

    const exportBookmark = (bookmark: Bookmark) => ({ cfi: bookmark.cfi })

    const redrawBookmarks = () => {
      const { cfi: currentCfi, pageIndex: currentPageIndex, readingItemIndex: currentReadingItemIndex } = reader.pagination.getBeginInfo()

      if (currentPageIndex === undefined || currentReadingItemIndex === undefined) {
        destroyBookmarkElement()

        return
      }

      const bookmarkOnPage = bookmarks.find(bookmark =>
        (
          bookmark.pageIndex === currentPageIndex
          && bookmark.readingItemIndex === currentReadingItemIndex
        )
        // sometime the next page contains part of the previous page and the cfi is actually
        // the same for the page too. This special case can happens for
        // cover pages that are not well paginated for example.
        // It's better to duplicate the bookmark on the next page rather than having the user
        // wonder why he cannot interact with the bookmark area.
        || bookmark.cfi === currentCfi
      )

      if (bookmarkOnPage) {
        createBookmarkElement()
      } else {
        destroyBookmarkElement()
      }
    }

    const createBookmarkElement = () => {
      reader.manipulateContainer(container => {
        if (container.ownerDocument.getElementById(ELEMENT_ID)) return
        const element = container.ownerDocument.createElement(`div`)
        element.id = ELEMENT_ID
        element.style.cssText = `
          top: 0px;
          right: 0px;
          background: transparent;
          position: absolute;
          width: ${settings.areaWidth}px;
          height: ${settings.areaHeight}px;
          display: flex;
          justify-content: center;
        `
        const innerWrapper = container.ownerDocument.createElement(`div`)
        innerWrapper.style.cssText = `
        margin-top: -${((settings.areaWidth / settings.areaHeight) * settings.areaHeight * 1.2) - settings.areaHeight}px;
        `
        innerWrapper.innerHTML = getIcon(Math.max(settings.areaHeight, settings.areaWidth) * 1.2)
        element.appendChild(innerWrapper)
        container.appendChild(element)

        // @todo should we remove listener even if we remove the dom element ? gc is fine ?
        element.addEventListener(`click`, removeBookmarksOnCurrentPage)
      })
    }

    const removeBookmarksOnCurrentPage = () => {
      // @todo handle spread
      const beginReadingItem = reader.pagination.getBeginInfo().readingItemIndex
      if (beginReadingItem !== undefined) {
        bookmarks = bookmarks.filter(bookmark => bookmark.readingItemIndex !== beginReadingItem)
      }
      redrawBookmarks()
      subject.next({ type: `update`, data: bookmarks.map(exportBookmark) })
    }

    const destroyBookmarkElement = () => {
      reader.manipulateContainer(container => {
        container.ownerDocument.getElementById(ELEMENT_ID)?.remove()
      })
    }

    const updateBookmarkLocations = () => {
      bookmarks.forEach(bookmark => {
        const { pageIndex, readingItemIndex } = reader.getCfiInformation(bookmark.cfi) || {}
        bookmark.pageIndex = pageIndex
        bookmark.readingItemIndex = readingItemIndex
      })
    }

    /**
     * Bookmark area is top right corner
     */
    const isClickEventInsideBookmarkArea = (e: MouseEvent | PointerEvent) => {
      const event = reader.normalizeEvent(e)

      const { width } = reader.context.getVisibleAreaRect()

      if (
        ((event.x || 0) >= (width - settings.areaWidth))
        && ((event.y || 0) <= settings.areaHeight)
      ) {
        return true
      }

      return false
    }

    const onDocumentClick = (e: MouseEvent) => {
      if (isClickEventInsideBookmarkArea(e)) {
        const newBookmark = createBookmarkFromCurrentPagination()

        if (!newBookmark) {
          logger.warn(`Unable to retrieve cfi for bookmark. You might want to wait for the chapter to be ready before letting user create bookmark`)
          return
        }

        if (bookmarks.find(({ cfi }) => newBookmark.cfi === cfi)) {
          logger.warn(`A bookmark for this cfi already exist, skipping process!`)
          return
        }

        e.stopPropagation()
        e.preventDefault()

        bookmarks.push(newBookmark)
        redrawBookmarks()

        subject.next({ type: `update`, data: bookmarks.map(exportBookmark) })

        logger.log(`added new bookmark`, newBookmark)
      }
    }

    // Register hook to trigger bookmark when user click on iframe.
    // By design clicking on bookmark is possible only once the frame
    // is loaded.
    reader.manipulateContainer(container => {
      container.addEventListener('click', onDocumentClick, { capture: true })

      return () => {
        container.removeEventListener(`click`, onDocumentClick)
      }
    })

    reader.registerHook(`readingItem.onLoad`, ({ frame }) => {
      frame.contentWindow?.addEventListener(`click`, onDocumentClick, { capture: true })
    })

    // We only need to redraw bookmarks when the pagination
    // change in theory. Any time the layout change, the pagination
    // will be updated as well and therefore trigger this redraw
    const paginationSubscription = reader.pagination$
      .pipe(
        filter(event => event.event === `change`),
        tap(redrawBookmarks)
      )
      .subscribe()

    // We make sure to update location of bookmarks on every layout
    // update since the bookmark could be on a different page, etc
    const readerSubscription = reader.$
      .pipe(
        filter(event => event.type === `layoutUpdate`),
        tap(updateBookmarkLocations)
      )
      .subscribe()

    const destroy = () => {
      paginationSubscription.unsubscribe()
      readerSubscription.unsubscribe()
      return reader.destroy()
    }

    return {
      ...reader,
      destroy,
      bookmarks: {
        isClickEventInsideBookmarkArea,
        __debug: () => bookmarks
      },
      bookmarks$: subject.asObservable(),
    }
  }
