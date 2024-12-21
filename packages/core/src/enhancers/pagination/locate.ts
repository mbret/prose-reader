import {
  of,
  startWith,
  map,
  debounceTime,
  switchScan,
  forkJoin,
  withLatestFrom,
  finalize,
} from "rxjs"
import { deferIdle, idle } from "../../utils/rxjs"
import { Reader } from "../../reader"
import { isDefined } from "../../utils/isDefined"

export type LocatableResource = {
  cfi: string
  // @todo eventually support range in CFI
  endCfi?: string
}

export type ConsolidatedResource = LocatableResource & {
  meta?: {
    itemIndex?: number
    itemPageIndex?: number
    absolutePageIndex?: number
    startNode?: Node
    startOffset?: number
    range?: Range
  }
}

export const consolidate = (item: ConsolidatedResource, reader: Reader) => {
  let itemPageIndex = item.meta?.itemPageIndex
  const { itemIndex } = reader.cfi.parseCfi(item.cfi)
  const spineItem = reader.spineItemsManager.get(itemIndex)

  if (!spineItem) return of({ ...item, meta: { ...item.meta, itemIndex } })

  if (spineItem.renditionLayout === `pre-paginated`) {
    itemPageIndex = 0
  }

  return idle().pipe(
    withLatestFrom(spineItem.isReady$),
    map(([, isSpineItemReady]) => {
      let range: Range | undefined = undefined

      const { node: startNode, offset: startOffset } =
        reader.cfi.resolveCfi({ cfi: item.cfi }) ?? {}

      if (spineItem.renditionLayout !== `pre-paginated` && startNode) {
        itemPageIndex =
          reader.spine.locator.spineItemLocator.getSpineItemPageIndexFromNode(
            startNode,
            startOffset ?? 0,
            spineItem,
          ) ?? itemPageIndex
      }

      if (startNode && item.endCfi) {
        const { node: endNode, offset: endOffset } =
          reader.cfi.resolveCfi({ cfi: item.cfi }) ?? {}

        if (endNode && isSpineItemReady) {
          range = startNode?.ownerDocument?.createRange()
          range?.setStart(startNode, startOffset ?? 0)
          range?.setEnd(endNode, endOffset ?? 0)
        }
      }

      let absolutePageIndex = item.meta?.absolutePageIndex

      if (itemPageIndex !== undefined) {
        absolutePageIndex =
          reader.spine.locator.getAbsolutePageIndexFromPageIndex({
            pageIndex: itemPageIndex,
            spineItemOrId: spineItem,
          }) ?? item.meta?.absolutePageIndex
      }

      return {
        ...item,
        meta: {
          ...item.meta,
          range,
          itemIndex,
          startNode,
          startOffset,
          absolutePageIndex,
          itemPageIndex,
        },
      }
    }),
  )
}

export const createLocator =
  (reader: Reader) =>
  <T extends LocatableResource>(resources: T[]) => {
    return deferIdle(() => {
      if (!resources.length) return of(resources)

      const consolidate$ = reader.layout$.pipe(
        debounceTime(10),
        startWith(null),
        switchScan((acc$) => {
          return forkJoin(
            acc$.map((resource) =>
              deferIdle(() => consolidate(resource, reader)).pipe(
                map((value) => value as ConsolidatedResource & T),
              ),
            ),
          )
        }, resources),
      )

      /**
       * We only force open reflowable spine items.
       * This is because page index and absolute pages can be retrieved on
       * a pre-paginated content without having to load it.
       */
      const reflowableItemIndexes = resources
        .map((item) => reader.cfi.parseCfi(item.cfi).itemIndex)
        .filter(isDefined)
        .filter((index) => {
          return (
            reader.spineItemsManager.get(index)?.renditionLayout ===
            `reflowable`
          )
        })

      const release = reader.spine.spineItemsLoader.forceOpen(
        reflowableItemIndexes,
      )

      return consolidate$.pipe(
        finalize(() => {
          /**
           * Make sure we wait a bit so if the user re-locate right after
           * we don't have a flicker of unload/load. It helps stabilize
           * resubscribing.
           */
          setTimeout(() => {
            release()
          }, 1000)
        }),
      )
    })
  }
