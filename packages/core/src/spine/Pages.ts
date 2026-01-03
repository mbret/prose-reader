import {
  combineLatest,
  map,
  type Observable,
  of,
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
import { idle } from "../utils/rxjs"
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

type State = {
  pages: PageEntry[]
}

/**
 * Hold relevant information about spine pages.
 */
export class Pages extends ReactiveEntity<State> {
  public readonly layout$: Observable<State>

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
        const pages = spineItemsManager.items.reduce(
          (
            acc: (Omit<PageEntry, "firstVisibleNode"> & {
              spineItem: SpineItem
            })[],
            spineItem,
            itemIndex,
          ) => {
            const pages = new Array(spineItem.numberOfPages).fill(undefined)

            const pagesAbsolutePositions = pages.map((_, pageIndex) => {
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

              return {
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
                absolutePageIndex: acc.length + pageIndex,
                spineItem,
                pageIndex,
              }
            })

            return [...acc, ...pagesAbsolutePositions]
          },
          [],
        )

        const pages$ = combineLatest(
          pages.map((page) => {
            const { spineItem: _unused, ...rest } = page

            /**
             * Note that this part adds a significant overhead
             * - lot of rxjs subscribers
             * - overhead of the idle browser task chain
             * - overhead with node finding
             * This is directly tied to the number of items the user loads in parallel
             * and the size of the book.
             * However there are realistically no reason a user would want to load
             * a massive book entirely in parallel.
             */
            if (page.spineItem.value.isLoaded) {
              const frame = page.spineItem.renderer?.getDocumentFrame()

              if (
                frame &&
                frame?.contentWindow?.document &&
                frame.contentWindow.document.body !== null
              ) {
                const _document = frame.contentWindow.document

                // might need to buffer them to run them all within a single idle task.
                // not sure stacking lot of them like this is a good idea. additionally, maybe we can
                // use something more efficient if its just to ensure 60fps.
                return idle().pipe(
                  map(() => {
                    const firstVisibleNode =
                      getFirstVisibleNodeForPositionRelativeTo(
                        _document,
                        page.layout,
                      )

                    return {
                      ...rest,
                      firstVisibleNode,
                    }
                  }),
                )
              }
            }

            // Fast path: No overhead for majority of pages
            return of({ ...rest, firstVisibleNode: undefined })
          }),
        )

        return pages$
      }),
      map((pages) => {
        Report.info(`Pages layout`, pages)
        return { pages }
      }),
      share(),
    )

    this.layout$.pipe(takeUntil(this.destroy$)).subscribe(this.next.bind(this))
  }

  fromSpineItemPageIndex = (spineItem: SpineItem, pageIndex: number) => {
    return this.value.pages.find(
      (page) =>
        page.itemIndex === spineItem.index && page.pageIndex === pageIndex,
    )
  }

  fromAbsolutePageIndex = (absolutePageIndex: number) => {
    return this.value.pages.find(
      (page) => page.absolutePageIndex === absolutePageIndex,
    )
  }

  observeFromAbsolutePageIndex = (absolutePageIndex: number) =>
    this.pipe(map(() => this.fromAbsolutePageIndex(absolutePageIndex)))
}
