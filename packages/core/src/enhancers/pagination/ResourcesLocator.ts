import {
  type Observable,
  combineLatest,
  debounceTime,
  defaultIfEmpty,
  finalize,
  map,
  of,
  startWith,
  switchScan,
  withLatestFrom,
} from "rxjs"
import { generateRootCfi } from "../../cfi"
import type { Reader } from "../../reader"
import type { SpineItem } from "../../spineItem/SpineItem"
import { deferIdle, idle } from "../../utils/rxjs"

type CfiLocatableResource = {
  cfi: string
  // @todo eventually support range in CFI
  endCfi?: string
}

export type LocatableResource = SpineItem | CfiLocatableResource

export type ConsolidatedResource = CfiLocatableResource & {
  itemIndex?: number
  itemPageIndex?: number
  absolutePageIndex?: number
  startNode?: Node
  startOffset?: number
  range?: Range
}

const toCfiLocatableResource = (
  reader: Reader,
  resource: LocatableResource | CfiLocatableResource,
): CfiLocatableResource => {
  if ("cfi" in resource) {
    return resource
  }

  const item = reader.spineItemsManager.get(resource)

  if (!item) {
    throw new Error(`Spine item not found`)
  }

  return {
    cfi: generateRootCfi(item.item),
  }
}

export const consolidate = (
  resource: ConsolidatedResource,
  reader: Reader,
): Observable<ConsolidatedResource> => {
  let itemPageIndex = resource?.itemPageIndex
  const { itemIndex } = reader.cfi.parseCfi(resource.cfi)
  const spineItem = reader.spineItemsManager.get(itemIndex)

  if (!spineItem) return of({ ...resource, itemIndex })

  return idle().pipe(
    withLatestFrom(spineItem.isReady$),
    map(([, isSpineItemReady]) => {
      let range: Range | undefined = undefined

      const { node: startNode, offset: startOffset } =
        reader.cfi.resolveCfi({ cfi: resource.cfi }) ?? {}

      const reflowableItemWithFoundNode =
        spineItem.renditionLayout !== `pre-paginated` && startNode

      if (reflowableItemWithFoundNode) {
        itemPageIndex =
          reader.spine.locator.spineItemLocator.getSpineItemPageIndexFromNode(
            startNode,
            startOffset ?? 0,
            spineItem,
          ) ?? itemPageIndex
      }

      if (startNode && resource.endCfi) {
        const { node: endNode, offset: endOffset } =
          reader.cfi.resolveCfi({ cfi: resource.cfi }) ?? {}

        if (endNode && isSpineItemReady) {
          range = startNode?.ownerDocument?.createRange()
          range?.setStart(startNode, startOffset ?? 0)
          range?.setEnd(endNode, endOffset ?? 0)
        }
      }

      let absolutePageIndex = resource?.absolutePageIndex

      /**
       * No itemPageIndex resolved from cfi.
       * We fallback to 0.
       */
      if (itemPageIndex === undefined) {
        itemPageIndex = 0
      }

      absolutePageIndex =
        reader.spine.locator.getAbsolutePageIndexFromPageIndex({
          pageIndex: itemPageIndex,
          spineItemOrId: spineItem,
        }) ?? resource?.absolutePageIndex

      return {
        ...resource,
        range,
        itemIndex,
        startNode: startNode ?? undefined,
        startOffset,
        absolutePageIndex,
        itemPageIndex,
      }
    }),
  )
}

type Options = {
  /**
   * does not load document if shallow
   */
  mode?: "shallow" | "load"
}

/**
 * @todo optimize and share as much as possible when several same items are retrieved
 */
export class ResourcesLocator {
  constructor(private reader: Reader) {}

  locate = <T extends LocatableResource>(
    resource: T,
    options: Options,
  ): Observable<{ resource: T; meta: ConsolidatedResource }> => {
    const cfiConsolidatedResource = {
      resource,
      meta: toCfiLocatableResource(this.reader, resource),
    }

    return deferIdle(() => {
      const consolidate$ = this.reader.spine.spineLayout.layout$.pipe(
        debounceTime(10),
        startWith(cfiConsolidatedResource),
        switchScan((acc) => {
          return consolidate(acc.meta, this.reader).pipe(
            map((consolidatedResource) => ({
              ...acc,
              meta: consolidatedResource,
            })),
          )
        }, cfiConsolidatedResource),
      )

      /**
       * We only force open reflowable spine items.
       * This is because page index and absolute pages can be retrieved on
       * a pre-paginated content without having to load it.
       */
      const itemIndex = this.reader.cfi.parseCfi(
        cfiConsolidatedResource.meta.cfi,
      )?.itemIndex
      const item = this.reader.spineItemsManager.get(itemIndex)
      const isReflowable = item?.renditionLayout === `reflowable`

      const release =
        options.mode === "shallow" || !isReflowable || !item
          ? () => {}
          : this.reader.spine.spineItemsLoader.forceOpen([item.index])

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

  locateResource<T extends LocatableResource>(
    resource: T,
    options?: Options,
  ): Observable<{ resource: T; meta: ConsolidatedResource }>
  locateResource<T extends LocatableResource>(
    resource: T[],
    options?: Options,
  ): Observable<{ resource: T; meta: ConsolidatedResource }[]>
  locateResource<T extends LocatableResource>(
    resource: T | T[],
    options?: Options,
  ):
    | Observable<{ resource: T; meta: ConsolidatedResource }>
    | Observable<{ resource: T; meta: ConsolidatedResource }[]> {
    if (Array.isArray(resource)) {
      return deferIdle(() =>
        combineLatest(
          resource.map((item) => this.locate(item, options ?? {})),
        ).pipe(defaultIfEmpty([])),
      )
    }

    return this.locate(resource, options ?? {})
  }
}
