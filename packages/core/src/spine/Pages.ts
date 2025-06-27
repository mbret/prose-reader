import {
  Observable,
  combineLatest,
  map,
  share,
  switchMap,
  takeUntil,
  tap,
  withLatestFrom,
} from "rxjs"
import type { Context } from "../context/Context"
import type { SpineItem } from "../spineItem/SpineItem"
import type { SpineItemLocator } from "../spineItem/locationResolver"
import { SpineItemPageLayout } from "../spineItem/types"
import { ReactiveEntity } from "../utils/ReactiveEntity"
import { getFirstVisibleNodeForPositionRelativeTo } from "../utils/dom"
import type { Viewport } from "../viewport/Viewport"
import type { SpineItemsManager } from "./SpineItemsManager"
import type { SpineLayout } from "./SpineLayout"
import type { SpineLocator } from "./locator/SpineLocator"
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

type PageEntry = {
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
        console.log(pageSize)
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
            const { spineItem, ...rest } = page

            return new Observable<PageEntry>((subscriber) => {
              const frame = page.spineItem.renderer?.getDocumentFrame()
              let firstVisibleNode: { node: Node; offset: number } | undefined

              if (
                frame &&
                frame?.contentWindow?.document &&
                // very important because it is being used by next functions
                frame.contentWindow.document.body !== null
              ) {
                // @todo handle vertical
                firstVisibleNode = getFirstVisibleNodeForPositionRelativeTo(
                  frame.contentWindow.document,
                  page.layout,
                )
              }

              subscriber.next({ ...rest, firstVisibleNode })
            })
          }),
        )

        return pages$
      }),
      map((pages) => ({ pages })),
      tap(({ pages }) => {
        console.log(pages)
      }),
      share(),
    )

    this.layout$.pipe(takeUntil(this.destroy$)).subscribe(this.next.bind(this))
  }
}
