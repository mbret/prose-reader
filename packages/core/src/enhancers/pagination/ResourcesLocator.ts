import {
  asapScheduler,
  combineLatest,
  debounceTime,
  defaultIfEmpty,
  defer,
  distinctUntilChanged,
  EMPTY,
  finalize,
  map,
  merge,
  type Observable,
  ReplaySubject,
  scan,
  share,
  skip,
  startWith,
  switchMap,
  takeUntil,
  timer,
  withLatestFrom,
} from "rxjs"
import type { ProseParsedCfi } from "../../cfi/index.ts"
import type { Reader } from "../../reader.ts"
import type { SpineItem } from "../../spineItem/SpineItem.ts"
import { idle } from "../../utils/rxjs.ts"

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
     * it. While the item awaits a new layout, it stays the page the item's
     * last layout gave, and is `undefined` for a resource that was not located
     * on that layout. It is `undefined` otherwise.
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
 * item's loaded document gives. The node is measured against the item's last
 * layout, which its document matches only while the item awaits no new
 * layout.
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

  if (!node || spineItem.value.isDirty) return undefined

  return reader.spine.locator.getSpineItemPageIndexFromNode(
    node,
    startOffset ?? 0,
    spineItem,
  )
}

/** Where a cfi is now. */
const consolidate = (
  { cfi, parsedCfi, isCfiOfItemStart }: CfiToLocate,
  reader: Reader,
): ConsolidatedResource => {
  const spineItem = reader.spineItemsManager.get(parsedCfi.itemIndex)

  if (!spineItem) return { ...parsedCfi, cfi, node: null }

  const {
    node = null,
    offset: startOffset,
    range,
  } = spineItem.value.isReady ? reader.cfi.resolveCfi({ cfi }) : {}
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
}

/**
 * A consolidated resource, with the number of layouts its item had completed
 * when it was consolidated, counted from the start of its consolidation.
 */
type Consolidation = {
  resource: ConsolidatedResource
  layoutsOfItem: number
}

type Options = {
  /**
   * does not load document if shallow
   */
  mode?: "shallow" | "load"
}

export class ResourcesLocator {
  /**
   * One consolidation per cfi, shared by every resource located at that cfi.
   * It outlives its last subscriber until the current task ends: a list
   * located again at once, as a `switchMap` does when the list changes, keeps
   * the consolidations of the cfis it still holds.
   */
  private consolidationsByCfi = new Map<
    string,
    Observable<ConsolidatedResource>
  >()

  /** The next idle callback, shared by the consolidations created before it. */
  private readonly nextIdle$ = defer(() => idle()).pipe(share())

  /**
   * Emits on an idle callback after anything that can move a located
   * resource: a completed layout, or an item that becomes ready or stops being
   * ready. An item that unloads loses its pages at once, without waiting for
   * the layout its unload requests. Every consolidation reads again on the
   * same callback, so a list is located again in one pass.
   */
  private readonly relocation$: Observable<unknown>

  constructor(private reader: Reader) {
    this.relocation$ = merge(
      reader.spine.layout$,
      ...reader.spineItemsManager.items.map((spineItem) =>
        spineItem.isReady$.pipe(skip(1)),
      ),
    ).pipe(
      debounceTime(10),
      switchMap(() => idle()),
      share(),
    )
  }

  private getOrCreateConsolidation = (cfiToLocate: CfiToLocate) => {
    const { cfi } = cfiToLocate
    const existingConsolidation$ = this.consolidationsByCfi.get(cfi)

    if (existingConsolidation$) return existingConsolidation$

    const spineItem = this.reader.spineItemsManager.get(
      cfiToLocate.parsedCfi.itemIndex,
    )
    const layoutsOfItem$ = (spineItem?.didLayout$ ?? EMPTY).pipe(
      scan((layouts) => layouts + 1, 0),
      startWith(0),
    )

    /**
     * While its item awaits a new layout, its document may already differ
     * from its last layout, which the published pages still describe. A
     * consolidation made on that layout is kept until the new one completes.
     */
    const consolidation$ = merge(this.nextIdle$, this.relocation$).pipe(
      withLatestFrom(layoutsOfItem$),
      scan<[unknown, number], Consolidation, undefined>(
        (previous, [, layoutsOfItem]) => {
          const awaitsLayout =
            spineItem?.value.isReady === true && spineItem.value.isDirty

          if (awaitsLayout && previous?.layoutsOfItem === layoutsOfItem) {
            return previous
          }

          return {
            resource: consolidate(cfiToLocate, this.reader),
            layoutsOfItem,
          }
        },
        undefined,
      ),
      map(({ resource }) => resource),
      distinctUntilChanged(),
      finalize(() => this.consolidationsByCfi.delete(cfi)),
      share({
        connector: () => new ReplaySubject(1),
        resetOnRefCountZero: () => timer(0, asapScheduler),
      }),
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

    return defer(() => {
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
      return combineLatest(
        resource.map((item) => this.locate(item, options ?? {})),
      ).pipe(
        // Its consolidations read on the same callback: the list emits once.
        debounceTime(0, asapScheduler),
        defaultIfEmpty([]),
        takeUntil(this.reader.$.destroy$),
      )
    }

    return this.locate(resource, options ?? {})
  }
}
