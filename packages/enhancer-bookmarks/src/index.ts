import { Enhancer, Report } from '@prose-reader/core'
import { Observable, Subject } from 'rxjs'
import { filter, tap } from 'rxjs/operators'
import { getIcon } from './icon'

const PACKAGE_NAME = `@prose-reader/enhancer-bookmarks`
const ELEMENT_ID = PACKAGE_NAME
const logger = Report.namespace(PACKAGE_NAME)
const SHOULD_NOT_LAYOUT = false

type Bookmark = {
  cfi: string,
  pageIndex: number | undefined,
  spineItemIndex: number | undefined
}

type ExportableBookmark = Pick<Bookmark, `cfi`>

type SubjectType = { type: `update`, data: ExportableBookmark[] }

export const createBookmarksEnhancer = ({ bookmarks: initialBookmarks }: { bookmarks: ExportableBookmark[] }): Enhancer<{}, {
  bookmarks: {
    isClickEventInsideBookmarkArea: (e: PointerEvent | MouseEvent) => boolean,
    $: Observable<SubjectType>
  },
}> =>
  next => options => {
    const reader = next(options)
    let bookmarks: Bookmark[] = initialBookmarks.map(incompleteBookmark => ({ ...incompleteBookmark, pageIndex: undefined, spineItemIndex: undefined }))
    const subject = new Subject<SubjectType>()
    const settings = {
      areaWidth: 50,
      areaHeight: 30
    }

    const getCfiInformation = (cfi: string) => {
      const { node, offset = 0, spineItemIndex } = reader.resolveCfi(cfi) || {}

      if (node && spineItemIndex !== undefined) {
        const pageIndex = reader.locator.getSpineItemPageIndexFromNode(node, offset, spineItemIndex)

        return { cfi, pageIndex, spineItemIndex }
      }

      return { cfi, pageIndex: undefined, spineItemIndex }
    }

    const createBookmarkFromCurrentPagination = () => {
      const cfi = reader.innerPagination.getBeginInfo().cfi

      if (cfi) {
        return getCfiInformation(cfi)
      }

      return undefined
    }

    const exportBookmark = (bookmark: Bookmark) => ({ cfi: bookmark.cfi })

    const redrawBookmarks = () => {
      const { cfi: currentCfi, pageIndex: currentPageIndex, spineItemIndex: currentSpineItemIndex } = reader.innerPagination.getBeginInfo()

      if (currentPageIndex === undefined || currentSpineItemIndex === undefined) {
        destroyBookmarkElement()

        return
      }

      const bookmarkOnPage = bookmarks.find(bookmark =>
        (
          bookmark.pageIndex === currentPageIndex &&
          bookmark.spineItemIndex === currentSpineItemIndex
        ) ||
        // sometime the next page contains part of the previous page and the cfi is actually
        // the same for the page too. This special case can happens for
        // cover pages that are not well paginated for example.
        // It's better to duplicate the bookmark on the next page rather than having the user
        // wonder why he cannot interact with the bookmark area.
        bookmark.cfi === currentCfi
      )

      if (bookmarkOnPage) {
        createBookmarkElement()
      } else {
        destroyBookmarkElement()
      }
    }

    const createBookmarkElement = () => {
      reader.manipulateContainer(container => {
        if (container.ownerDocument.getElementById(ELEMENT_ID)) return SHOULD_NOT_LAYOUT
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

        return SHOULD_NOT_LAYOUT
      })
    }

    const removeBookmarksOnCurrentPage = () => {
      // @todo handle spread
      const beginSpineItem = reader.innerPagination.getBeginInfo().spineItemIndex
      if (beginSpineItem !== undefined) {
        bookmarks = bookmarks.filter(bookmark => bookmark.spineItemIndex !== beginSpineItem)
      }
      redrawBookmarks()
      subject.next({ type: `update`, data: bookmarks.map(exportBookmark) })
    }

    const destroyBookmarkElement = () => {
      reader.manipulateContainer(container => {
        container.ownerDocument.getElementById(ELEMENT_ID)?.remove()

        return SHOULD_NOT_LAYOUT
      })
    }

    const updateBookmarkLocations = () => {
      bookmarks.forEach(bookmark => {
        const { pageIndex, spineItemIndex } = getCfiInformation(bookmark.cfi)
        bookmark.pageIndex = pageIndex
        bookmark.spineItemIndex = spineItemIndex
      })
    }

    /**
     * Bookmark area is top right corner
     */
    const isClickEventInsideBookmarkArea = (e: MouseEvent | PointerEvent) => {
      const event = reader.normalizeEventForViewport(e)

      const { width } = reader.context.getVisibleAreaRect()

      if (
        ((event.x || 0) >= (width - settings.areaWidth)) &&
        ((event.y || 0) <= settings.areaHeight)
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
    reader.manipulateContainer((container, onDestroy) => {
      container.addEventListener(`click`, onDocumentClick, { capture: true })

      onDestroy(() => {
        container.removeEventListener(`click`, onDocumentClick)
      })

      return SHOULD_NOT_LAYOUT
    })

    reader.registerHook(`item.onLoad`, ({ frame }) => {
      frame.contentWindow?.addEventListener(`click`, onDocumentClick, { capture: true })
    })

    // We only need to redraw bookmarks when the pagination
    // change in theory. Any time the layout change, the pagination
    // will be updated as well and therefore trigger this redraw
    const paginationSubscription = reader.innerPagination.$
      .pipe(
        filter(event => event.event === `change`),
        tap(redrawBookmarks)
      )
      .subscribe()

    // We make sure to update location of bookmarks on every layout
    // update since the bookmark could be on a different page, etc
    const readerSubscription = reader.$.layout$
      .pipe(
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
        $: subject.asObservable(),
        __debug: () => bookmarks
      }
    }
  }
