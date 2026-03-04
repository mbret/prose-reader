import {
  map,
  Observable,
  share,
  switchMap,
  takeUntil,
  withLatestFrom,
} from "rxjs"
import type { Context } from "../context/Context"
import type { SpineItemLocator } from "../spineItem/locationResolver"
import type { SpineItem } from "../spineItem/SpineItem"
import { SpineItemPageLayout } from "../spineItem/types"
import { getFirstVisibleNodeForPositionRelativeTo } from "../utils/dom"
import { ReactiveEntity } from "../utils/ReactiveEntity"
import type { Viewport } from "../viewport/Viewport"
import type { SpineLocator } from "./locator/SpineLocator"
import { Report } from "./report"
import type { SpineItemsManager } from "./SpineItemsManager"
import type { SpineLayout } from "./SpineLayout"
import { SpineItemPageSpineLayout, type SpinePosition } from "./types"

export const spinePositionToSpineItemSpineLayout = ({
  position,
  pageSize,
}: {
  position: SpinePosition
  pageSize: { height: number; width: number }
}) => {
  return new SpineItemPageSpineLayout({
    ...position,
    left: position.x,
    top: position.y,
    width: pageSize.width,
    height: pageSize.height,
    bottom: position.y + pageSize.height,
    right: position.x + pageSize.width,
  })
}

export type PageEntry = {
  absoluteLayout: SpineItemPageSpineLayout
  layout: SpineItemPageLayout
  itemIndex: number
  absolutePageIndex: number
  pageIndex: number
  firstVisibleNode: { node: Node; offset: number } | undefined
}

export type PagesState = {
  pages: PageEntry[]
}

type UnresolvedPageEntry = Omit<PageEntry, "firstVisibleNode"> & {
  spineItem: SpineItem
}

// Chunk heavy first-visible-node lookups to keep frame time predictable.
const FIRST_VISIBLE_NODE_PAGES_PER_FRAME = 10

const resolveFirstVisibleNodeForPage = (
  page: UnresolvedPageEntry,
): PageEntry => {
  const { spineItem: _unused, ...rest } = page

  if (!page.spineItem.value.isLoaded) {
    return {
      ...rest,
      firstVisibleNode: undefined,
    }
  }

  const frame = page.spineItem.renderer?.getDocumentFrame()
  const frameDocument = frame?.contentWindow?.document

  if (!frameDocument || frameDocument.body === null) {
    return {
      ...rest,
      firstVisibleNode: undefined,
    }
  }

  return {
    ...rest,
    firstVisibleNode: getFirstVisibleNodeForPositionRelativeTo(
      frameDocument,
      page.layout,
    ),
  }
}

const resolvePagesFirstVisibleNodeInFrames$ = (
  pages: UnresolvedPageEntry[],
) => {
  return new Observable<PageEntry[]>((observer) => {
    if (pages.length === 0) {
      observer.next([])
      observer.complete()
      return
    }

    let frameRequestId: number | undefined
    let nextPageIndex = 0

    const resolvedPages = new Array<PageEntry>(pages.length)

    const clearScheduled = () => {
      if (frameRequestId !== undefined) {
        cancelAnimationFrame(frameRequestId)
        frameRequestId = undefined
      }
    }

    const processChunk = () => {
      frameRequestId = undefined

      let processedCount = 0

      while (
        nextPageIndex < pages.length &&
        processedCount < FIRST_VISIBLE_NODE_PAGES_PER_FRAME
      ) {
        const page = pages[nextPageIndex]

        if (!page) {
          nextPageIndex = pages.length
          break
        }

        resolvedPages[nextPageIndex] = resolveFirstVisibleNodeForPage(page)
        nextPageIndex += 1
        processedCount += 1
      }

      if (nextPageIndex >= pages.length) {
        observer.next(resolvedPages)
        observer.complete()
        return
      }

      scheduleNextChunk()
    }

    const scheduleNextChunk = () => {
      frameRequestId = requestAnimationFrame(processChunk)
    }

    scheduleNextChunk()

    return () => {
      clearScheduled()
    }
  })
}

/**
 * Hold relevant information about spine pages.
 */
export class Pages extends ReactiveEntity<PagesState> {
  public readonly layout$: Observable<PagesState>

  constructor(
    public readonly spineLayout: SpineLayout,
    public readonly spineItemsManager: SpineItemsManager,
    public readonly spineItemLocator: SpineItemLocator,
    public readonly context: Context,
    public readonly locator: SpineLocator,
    public readonly viewport: Viewport,
  ) {
    super({ pages: [] })

    this.layout$ = spineLayout.layout$.pipe(
      withLatestFrom(viewport),
      switchMap(([, { pageSize }]) => {
        const pages = spineItemsManager.items.reduce<UnresolvedPageEntry[]>(
          (acc, spineItem, itemIndex) => {
            for (
              let pageIndex = 0;
              pageIndex < spineItem.numberOfPages;
              pageIndex += 1
            ) {
              // @todo handle vertical jp
              // top seems ok but left is not, it should probably not be 0 or something
              const pageSpineItemPosition =
                spineItemLocator.getSpineItemPositionFromPageIndex({
                  spineItem,
                  pageIndex,
                })

              const pageSpinePosition =
                locator.getSpinePositionFromSpineItemPosition({
                  spineItem,
                  spineItemPosition: pageSpineItemPosition,
                })

              const absolutePageIndex = acc.length

              acc.push({
                absoluteLayout: spinePositionToSpineItemSpineLayout({
                  pageSize,
                  position: pageSpinePosition,
                }),
                layout: new SpineItemPageLayout({
                  left: pageSpineItemPosition.x,
                  right: pageSpineItemPosition.x + pageSize.width,
                  top: pageSpineItemPosition.y,
                  bottom: pageSpineItemPosition.y + pageSize.height,
                  width: pageSize.width,
                  height: pageSize.height,
                  x: pageSpineItemPosition.x,
                  y: pageSpineItemPosition.y,
                }),
                itemIndex,
                absolutePageIndex,
                spineItem,
                pageIndex,
              })
            }

            return acc
          },
          [],
        )

        return resolvePagesFirstVisibleNodeInFrames$(pages)
      }),
      map((pages) => {
        Report.info(`Pages layout`, pages)
        return { pages }
      }),
      share(),
    )

    this.layout$.pipe(takeUntil(this.destroy$)).subscribe(this.next.bind(this))
  }

  static fromSpineItemPageIndex = (
    pagesState: PagesState,
    spineItem: SpineItem | number,
    pageIndex: number,
  ) => {
    const spineItemIndex =
      typeof spineItem === "number" ? spineItem : spineItem.index

    return pagesState.pages.find(
      (page) =>
        page.itemIndex === spineItemIndex && page.pageIndex === pageIndex,
    )
  }

  static fromNextPageWithinSameSpineItem = (
    pagesState: PagesState,
    pageEntry: PageEntry,
  ) => {
    return Pages.fromSpineItemPageIndex(
      pagesState,
      pageEntry.itemIndex,
      pageEntry.pageIndex + 1,
    )
  }

  static fromAbsolutePageIndex = (
    pagesState: PagesState,
    absolutePageIndex: number,
  ) => {
    return pagesState.pages.find(
      (page) => page.absolutePageIndex === absolutePageIndex,
    )
  }

  fromSpineItemPageIndex = (
    spineItem: SpineItem | number,
    pageIndex: number,
  ) => {
    return Pages.fromSpineItemPageIndex(this.value, spineItem, pageIndex)
  }

  fromNextPageWithinSameSpineItem = (pageEntry: PageEntry) => {
    return Pages.fromNextPageWithinSameSpineItem(this.value, pageEntry)
  }

  fromAbsolutePageIndex = (absolutePageIndex: number) => {
    return Pages.fromAbsolutePageIndex(this.value, absolutePageIndex)
  }

  observeFromAbsolutePageIndex = (absolutePageIndex: number) =>
    this.pipe(map(() => this.fromAbsolutePageIndex(absolutePageIndex)))
}
