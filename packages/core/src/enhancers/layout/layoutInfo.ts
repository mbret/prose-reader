import { map, share, shareReplay, takeUntil, tap } from "rxjs"
import type { Reader } from "../../reader"
import { Report } from "../../report"
import { SpineItemPageSpineLayout, type SpinePosition } from "../../spine/types"

export type PageLayoutInformation = {
  absolutePageIndex: number
  itemIndex: number
  absolutePosition: SpineItemPageSpineLayout
}

export type LayoutInfo = {
  pages: PageLayoutInformation[]
}

export const spinePositionToSpineItemSpineLayout = ({
  position,
  pageSize,
}: {
  position: SpinePosition
  pageSize: { height: number; width: number }
}) => {
  return new SpineItemPageSpineLayout({
    x: position.x,
    y: position.y,
    left: position.x,
    top: position.y,
    width: pageSize.width,
    height: pageSize.height,
    bottom: position.y + pageSize.height,
    right: position.x + pageSize.width,
  })
}

export const createLayoutInfo = (reader: Reader) => {
  const layout$ = reader.spine.spineLayout.layout$.pipe(
    map(() => {
      const items = reader.spine.spineItemsManager.items

      const pages = items.reduce((acc, spineItem, itemIndex) => {
        const pages = new Array(spineItem.numberOfPages).fill(undefined)

        const pagesAbsolutePositions = pages.map((_, pageIndex) => {
          const pageSpineItemPosition =
            reader.spine.spineItemLocator.getSpineItemPositionFromPageIndex({
              spineItem,
              pageIndex,
            })

          const pageSpinePosition =
            reader.spine.locator.getSpinePositionFromSpineItemPosition({
              spineItem,
              spineItemPosition: pageSpineItemPosition,
            })

          return spinePositionToSpineItemSpineLayout({
            pageSize: reader.context.getPageSize(),
            position: pageSpinePosition,
          })
        })

        const itemPagesInfo: PageLayoutInformation[] =
          pagesAbsolutePositions.map((absolutePosition, pageIndex) => ({
            itemIndex,
            absolutePageIndex: itemIndex + pageIndex,
            absolutePosition,
          }))

        return [...acc, ...itemPagesInfo]
      }, [] as PageLayoutInformation[])

      return {
        pages,
      }
    }),
    tap((layout) => {
      Report.debug(`layout:info`, layout)
    }),
    share(),
  )

  const info$ = layout$.pipe(shareReplay({ refCount: true, bufferSize: 1 }))

  info$.pipe(takeUntil(reader.$.destroy$)).subscribe()

  return { layout$, info$ }
}
