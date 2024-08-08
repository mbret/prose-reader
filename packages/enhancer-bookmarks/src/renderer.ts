import { Reader } from "@prose-reader/core"
import { BehaviorSubject, EMPTY, of, withLatestFrom } from "rxjs"
import { switchMap, take, tap, mergeMap } from "rxjs/operators"
import { PACKAGE_NAME, SHOULD_NOT_LAYOUT } from "./constants"
import { getIcon } from "./icon"
import { Bookmark } from "./types"

const ELEMENT_ID = PACKAGE_NAME

export const createRenderer = (
  reader: Reader,
  options: {
    areaWidth: number
    areaHeight: number
  },
) => {
  const element$ = new BehaviorSubject<HTMLElement | undefined>(undefined)
  const waitForViewportFree$ = reader.navigation.viewportFree$.pipe(take(1))

  const createBookmarkElement = () => {
    const container = reader.context.state.containerElement

    if (!container) return

    if (container.ownerDocument.getElementById(ELEMENT_ID)) return SHOULD_NOT_LAYOUT
    const element = container.ownerDocument.createElement(`div`)
    element.id = ELEMENT_ID
    element.style.cssText = `
        top: 0px;
        right: 0px;
        background: transparent;
        position: absolute;
        width: ${options.areaWidth}px;
        height: ${options.areaHeight}px;
        display: flex;
        justify-content: center;
      `
    const innerWrapper = container.ownerDocument.createElement(`div`)
    innerWrapper.style.cssText = `
        margin-top: -${(options.areaWidth / options.areaHeight) * options.areaHeight * 1.2 - options.areaHeight}px;
      `
    innerWrapper.innerHTML = getIcon(Math.max(options.areaHeight, options.areaWidth) * 1.2)
    element.appendChild(innerWrapper)
    container.appendChild(element)

    element$.next(element)

    return SHOULD_NOT_LAYOUT
  }

  const destroyBookmarkElement = () => {
    reader.context.state.containerElement?.ownerDocument.getElementById(ELEMENT_ID)?.remove()
  }

  const redrawBookmarks$ = (bookmarks: Bookmark[]) =>
    of(bookmarks).pipe(
      withLatestFrom(reader.pagination.pagination$),
      switchMap(([, pagination]) => {
        const {
          beginCfi: currentCfi,
          beginPageIndexInSpineItem: currentPageIndex,
          beginSpineItemIndex: currentSpineItemIndex,
        } = pagination

        if (currentPageIndex === undefined || currentSpineItemIndex === undefined) {
          destroyBookmarkElement()

          return EMPTY
        }

        const bookmarkOnPage = bookmarks.find(
          (bookmark) =>
            (bookmark.pageIndex === currentPageIndex && bookmark.spineItemIndex === currentSpineItemIndex) ||
            // sometime the next page contains part of the previous page and the cfi is actually
            // the same for the page too. This special case can happens for
            // cover pages that are not well paginated for example.
            // It's better to duplicate the bookmark on the next page rather than having the user
            // wonder why he cannot interact with the bookmark area.
            bookmark.cfi === currentCfi,
        )

        if (bookmarkOnPage) {
          /**
           * This ensure two things:
           * - animations are done so the bookmark only appears when the user is on page
           * - small opti
           */
          return element$.pipe(
            take(1),
            mergeMap((element) => {
              if (element) {
                destroyBookmarkElement()
              }

              return waitForViewportFree$.pipe(tap(createBookmarkElement))
            }),
          )
        } else {
          destroyBookmarkElement()
        }

        return EMPTY
      }),
    )

  return {
    redrawBookmarks$,
    $: {
      element$: element$.asObservable(),
    },
  }
}
