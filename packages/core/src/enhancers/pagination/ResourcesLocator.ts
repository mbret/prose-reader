import {
  type Observable,
  combineLatest,
  debounceTime,
  defaultIfEmpty,
  finalize,
  map,
  of,
  shareReplay,
  startWith,
  switchScan,
  withLatestFrom,
} from "rxjs"
import { generateRootCfi, type resolveCfi } from "../../cfi"
import type { Reader } from "../../reader"
import type { SpineItem } from "../../spineItem/SpineItem"
import { deferIdle, idle } from "../../utils/rxjs"

type CfiLocatableResource = {
  cfi: string
}

export type LocatableResource = SpineItem | CfiLocatableResource

export type ConsolidatedResource = ReturnType<typeof resolveCfi> &
  CfiLocatableResource & {
    itemIndex?: number
    itemPageIndex?: number
    absolutePageIndex?: number
    startNode?: Node
    startOffset?: number
    range?: Range | null
  }

const toCfiLocatableResource = (
  reader: Reader,
  resource: LocatableResource | CfiLocatableResource,
): ConsolidatedResource => {
  if ("cfi" in resource) {
    const { itemIndex, ...restParsedCfi } = reader.cfi.parseCfi(resource.cfi)

    return {
      ...resource,
      ...restParsedCfi,
      itemIndex,
    }
  }

  const item = reader.spineItemsManager.get(resource)

  if (!item) {
    throw new Error(`Spine item not found`)
  }

  const cfi = generateRootCfi(item.item)

  const parsedCfi = reader.cfi.parseCfi(cfi)

  return {
    ...parsedCfi,
    cfi: generateRootCfi(item.item),
    itemIndex: item.index,
  }
}

export const consolidate = (
  resource: ConsolidatedResource,
  reader: Reader,
): Observable<ConsolidatedResource> => {
  let itemPageIndex = resource?.itemPageIndex
  const { itemIndex, ...restParsedCfi } = reader.cfi.parseCfi(resource.cfi)
  const spineItem = reader.spineItemsManager.get(itemIndex)

  if (!spineItem) return of({ ...resource, itemIndex, ...restParsedCfi })

  return idle().pipe(
    withLatestFrom(spineItem.isReady$),
    map(([, isSpineItemReady]) => {
      const {
        node,
        offset: startOffset,
        range,
      } = isSpineItemReady ? reader.cfi.resolveCfi({ cfi: resource.cfi }) : {}

      const reflowableItemWithFoundNode =
        spineItem.renditionLayout !== `pre-paginated` && node

      if (reflowableItemWithFoundNode) {
        itemPageIndex =
          reader.spine.locator.spineItemLocator.getSpineItemPageIndexFromNode(
            node,
            startOffset ?? 0,
            spineItem,
          ) ?? itemPageIndex
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
        reader.spine.locator._getAbsolutePageIndexFromPageIndex({
          pageIndex: itemPageIndex,
          spineItemOrId: spineItem,
        }) ?? resource?.absolutePageIndex

      return {
        ...resource,
        ...restParsedCfi,
        range,
        itemIndex,
        startNode: node ?? undefined,
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

  private locatorsByKey = new Map<
    string,
    {
      observerCount: number
      consolidate$: Observable<{
        resource: LocatableResource
        meta: ConsolidatedResource
      }>
    }
  >()

  private deregisterMemoizedStream = (key: string) => {
    const value = this.locatorsByKey.get(key)

    if (!value) return

    value.observerCount--

    if (value.observerCount === 0) {
      this.locatorsByKey.delete(key)
    }
  }

  locate = <T extends LocatableResource>(
    resource: T,
    options: Options,
  ): Observable<{ resource: T; meta: ConsolidatedResource }> => {
    const initialConsolidatedValue = {
      resource,
      meta: toCfiLocatableResource(this.reader, resource),
    }

    return deferIdle(() => {
      /**
       * We only force open reflowable spine items.
       * This is because page index and absolute pages can be retrieved on
       * a pre-paginated content without having to load it.
       */

      const item = this.reader.spineItemsManager.get(
        initialConsolidatedValue.meta.itemIndex ?? 0,
      )
      const isReflowable = item?.renditionLayout === `reflowable`

      const release =
        options.mode === "shallow" || !isReflowable || !item
          ? () => {}
          : this.reader.spine.spineItemsLoader.forceOpen([item.index])

      const key = "cfi" in resource ? resource.cfi : undefined
      const memoizedConsolidate$ = key ? this.locatorsByKey.get(key) : undefined

      const withRelease = (
        stream: Observable<{ resource: T; meta: ConsolidatedResource }>,
      ) => {
        return stream.pipe(
          finalize(() => {
            if (key) {
              this.deregisterMemoizedStream(key)
            }

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
      }

      if (key && memoizedConsolidate$) {
        memoizedConsolidate$.observerCount++

        return withRelease(
          memoizedConsolidate$.consolidate$.pipe(
            map(({ resource, meta }) => ({
              resource: resource as T,
              meta: meta as ConsolidatedResource,
            })),
          ),
        )
      }

      const consolidate$ = this.reader.spine.layout$.pipe(
        debounceTime(10),
        startWith(initialConsolidatedValue),
        switchScan((acc) => {
          return consolidate(acc.meta, this.reader).pipe(
            map((consolidatedResource) => ({
              ...acc,
              meta: consolidatedResource,
            })),
          )
        }, initialConsolidatedValue),
        shareReplay({ refCount: true, bufferSize: 1 }),
      )

      if (key) {
        this.locatorsByKey.set(key, {
          observerCount: 1,
          consolidate$,
        })
      }

      return withRelease(consolidate$)
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
