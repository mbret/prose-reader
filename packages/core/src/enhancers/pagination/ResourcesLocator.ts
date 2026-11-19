import {
  combineLatest,
  debounceTime,
  defaultIfEmpty,
  finalize,
  map,
  type Observable,
  of,
  shareReplay,
  startWith,
  switchMap,
  takeUntil,
  withLatestFrom,
} from "rxjs"
import type { ProseParsedCfi } from "../../cfi/index.ts"
import type { Reader } from "../../reader.ts"
import type { SpineItem } from "../../spineItem/SpineItem.ts"
import { deferIdle, idle } from "../../utils/rxjs.ts"

type CfiLocatableResource = {
  cfi: string
}

export type LocatableResource = SpineItem | CfiLocatableResource

export type ConsolidatedResource = ReturnType<Reader["cfi"]["resolveCfi"]> &
  ProseParsedCfi &
  CfiLocatableResource & {
    /**
     * The page of its spine item the resource is on, once it is known: at
     * once for a pre-paginated item and for a cfi that names only its item,
     * otherwise while the item is loaded and laid out. It is `undefined`
     * before, rather than a page the resource may not be on.
     */
    itemPageIndex?: number
    /** The page of the book the resource is on, known with `itemPageIndex`. */
    absolutePageIndex?: number
    startOffset?: number
    range?: Range | null
  }

/** The cfi of a resource: a spine item is located at its start. */
const getLocatableResourceCfi = (
  reader: Reader,
  resource: LocatableResource,
) => {
  if ("cfi" in resource) return resource.cfi

  const item = reader.spineItemsManager.get(resource)

  if (!item) {
    throw new Error(`Spine item not found`)
  }

  return reader.cfi.generateRootCfi(item.item)
}

/**
 * Locates a cfi in the reader as it is now. Only the cfi is read, never what
 * an earlier consolidation found: a page found on an earlier layout may not be
 * a page of this one.
 */
const consolidate = (
  cfi: string,
  reader: Reader,
): Observable<ConsolidatedResource> => {
  const parsedCfi = reader.cfi.parseCfi(cfi)
  const isCfiOfItemStart = reader.cfi.isRootCfi(cfi)
  const spineItem = reader.spineItemsManager.get(parsedCfi.itemIndex)

  if (!spineItem) return of({ ...parsedCfi, cfi, node: null })

  return idle().pipe(
    withLatestFrom(spineItem.isReady$),
    map(([, isSpineItemReady]): ConsolidatedResource => {
      const {
        node = null,
        offset: startOffset,
        range,
      } = isSpineItemReady ? reader.cfi.resolveCfi({ cfi }) : {}

      /**
       * A pre-paginated item has one page, and a cfi naming only its item is
       * at the item's start. Any other cfi is on the page of its node, which
       * only the item's loaded document gives.
       */
      const itemPageIndex =
        spineItem.renditionLayout === `pre-paginated` || isCfiOfItemStart
          ? 0
          : node
            ? reader.spine.locator.getSpineItemPageIndexFromNode(
                node,
                startOffset ?? 0,
                spineItem,
              )
            : undefined

      return {
        ...parsedCfi,
        cfi,
        node,
        startOffset,
        range,
        itemPageIndex,
        absolutePageIndex:
          itemPageIndex === undefined
            ? undefined
            : reader.spine.locator._getAbsolutePageIndexFromPageIndex({
                pageIndex: itemPageIndex,
                spineItemOrId: spineItem,
              }),
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

export class ResourcesLocator {
  constructor(private reader: Reader) {}

  /**
   * One consolidation per cfi, shared by every resource located at that cfi
   * while any of them is subscribed.
   */
  private consolidationsByCfi = new Map<
    string,
    {
      observerCount: number
      consolidate$: Observable<ConsolidatedResource>
    }
  >()

  private getOrCreateConsolidation = (cfi: string) => {
    const existingConsolidation = this.consolidationsByCfi.get(cfi)

    if (existingConsolidation) return existingConsolidation

    const consolidation = {
      observerCount: 0,
      consolidate$: this.reader.spine.layout$.pipe(
        debounceTime(10),
        startWith(null),
        switchMap(() => consolidate(cfi, this.reader)),
        shareReplay({ refCount: true, bufferSize: 1 }),
      ),
    }

    this.consolidationsByCfi.set(cfi, consolidation)

    return consolidation
  }

  private releaseConsolidation = (cfi: string) => {
    const consolidation = this.consolidationsByCfi.get(cfi)

    if (!consolidation) return

    consolidation.observerCount--

    if (consolidation.observerCount === 0) {
      this.consolidationsByCfi.delete(cfi)
    }
  }

  locate = <T extends LocatableResource>(
    resource: T,
    options: Options,
  ): Observable<{ resource: T; meta: ConsolidatedResource }> => {
    const cfi = getLocatableResourceCfi(this.reader, resource)
    const { itemIndex } = this.reader.cfi.parseCfi(cfi)

    return deferIdle(() => {
      const item = this.reader.spineItemsManager.get(itemIndex)
      const isReflowable = item?.renditionLayout === `reflowable`

      /**
       * Only a reflowable item is kept loaded: a pre-paginated item gives its
       * page indexes without being loaded.
       */
      const release =
        options.mode === "shallow" || !isReflowable || !item
          ? () => {}
          : this.reader.keepSpineItemLoaded(item)

      const consolidation = this.getOrCreateConsolidation(cfi)

      consolidation.observerCount++

      return consolidation.consolidate$.pipe(
        map((meta) => ({ resource, meta })),
        finalize(() => {
          this.releaseConsolidation(cfi)

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
    }).pipe(takeUntil(this.reader.$.destroy$))
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
      ).pipe(takeUntil(this.reader.$.destroy$))
    }

    return this.locate(resource, options ?? {})
  }
}
