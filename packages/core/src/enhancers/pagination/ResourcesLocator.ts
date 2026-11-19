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
     * otherwise while the item is loaded and laid out and the cfi resolves in
     * it. It is `undefined` otherwise.
     */
    itemPageIndex?: number
    /** The page of the book the resource is on, known with `itemPageIndex`. */
    absolutePageIndex?: number
    startOffset?: number
    range?: Range | null
  }

/** A spine item is located at its start. */
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

type CfiToLocate = {
  cfi: string
  parsedCfi: ReturnType<Reader["cfi"]["parseCfi"]>
  isCfiOfItemStart: boolean
}

/**
 * A pre-paginated item has one page, and a cfi naming only its item is at the
 * item's start. Any other cfi is on the page of its node, which only the
 * item's loaded document gives.
 */
const getItemPageIndex = ({
  reader,
  spineItem,
  isCfiOfItemStart,
  node,
  startOffset,
}: {
  reader: Reader
  spineItem: SpineItem
  isCfiOfItemStart: boolean
  node: Node | null
  startOffset: number | undefined
}) => {
  if (spineItem.renditionLayout === `pre-paginated` || isCfiOfItemStart) {
    return 0
  }

  if (!node) return undefined

  return reader.spine.locator.getSpineItemPageIndexFromNode(
    node,
    startOffset ?? 0,
    spineItem,
  )
}

/**
 * Reads only the cfi: a page found on an earlier layout may not be a page of
 * the current one.
 */
const consolidate = (
  { cfi, parsedCfi, isCfiOfItemStart }: CfiToLocate,
  reader: Reader,
): Observable<ConsolidatedResource> => {
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
      const itemPageIndex = getItemPageIndex({
        reader,
        spineItem,
        isCfiOfItemStart,
        node,
        startOffset,
      })

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
    Observable<ConsolidatedResource>
  >()

  private getOrCreateConsolidation = (cfiToLocate: CfiToLocate) => {
    const { cfi } = cfiToLocate
    const existingConsolidation$ = this.consolidationsByCfi.get(cfi)

    if (existingConsolidation$) return existingConsolidation$

    const consolidation$ = this.reader.spine.layout$.pipe(
      debounceTime(10),
      startWith(null),
      switchMap(() => consolidate(cfiToLocate, this.reader)),
      finalize(() => this.consolidationsByCfi.delete(cfi)),
      shareReplay({ refCount: true, bufferSize: 1 }),
    )

    this.consolidationsByCfi.set(cfi, consolidation$)

    return consolidation$
  }

  locate = <T extends LocatableResource>(
    resource: T,
    options: Options,
  ): Observable<{ resource: T; meta: ConsolidatedResource }> => {
    const cfi = getLocatableResourceCfi(this.reader, resource)
    const cfiToLocate: CfiToLocate = {
      cfi,
      parsedCfi: this.reader.cfi.parseCfi(cfi),
      isCfiOfItemStart: this.reader.cfi.isRootCfi(cfi),
    }

    return deferIdle(() => {
      const item = this.reader.spineItemsManager.get(
        cfiToLocate.parsedCfi.itemIndex,
      )
      const isReflowable = item?.renditionLayout === `reflowable`

      /**
       * Only a reflowable item is kept loaded: a pre-paginated item gives its
       * page indexes without being loaded.
       */
      const release =
        options.mode === "shallow" || !isReflowable || !item
          ? () => {}
          : this.reader.keepSpineItemLoaded(item)

      return this.getOrCreateConsolidation(cfiToLocate).pipe(
        map((meta) => ({ resource, meta })),
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
