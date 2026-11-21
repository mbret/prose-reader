import {
  asapScheduler,
  combineLatest,
  debounceTime,
  defaultIfEmpty,
  defer,
  distinctUntilChanged,
  filter,
  finalize,
  map,
  merge,
  type Observable,
  ReplaySubject,
  scan,
  share,
  switchMap,
  takeUntil,
  timer,
} from "rxjs"
import type { ProseParsedCfi } from "../../cfi/index.ts"
import type { Reader } from "../../reader.ts"
import type { PagesState } from "../../spine/Pages.ts"
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
     * once for a pre-paginated item and for a cfi that names only its item.
     * Any other cfi has one when it is located while its item is loaded and
     * laid out, the published pages describe the item as its latest layout
     * lays it out, and the cfi resolves in it. It keeps that page while a
     * layout that can change the item is pending, until the next pages are
     * published. It is `undefined` otherwise.
     */
    itemPageIndex?: number
    /**
     * The page of the book the resource is on, as the published pages give
     * it, known with `itemPageIndex` once pages are published.
     */
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
  spineItem: SpineItem | undefined
}

/**
 * A pre-paginated item has one page, and a cfi naming only its item is at the
 * item's start. Any other cfi is on the page of its node, measured in the
 * item's document. A pending layout that can change the item may lay that
 * document out again, so the node has a page only while the published pages
 * describe the item as its latest layout lays it out.
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

  if (!node || !reader.spine.isLayoutCurrentFor(spineItem)) return undefined

  return reader.spine.locator.getSpineItemPageIndexFromNode(
    node,
    startOffset ?? 0,
    spineItem,
  )
}

const readCfi = (
  { cfi, parsedCfi, isCfiOfItemStart, spineItem }: CfiToLocate,
  reader: Reader,
): ConsolidatedResource => {
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
        : reader.spine.pages.fromSpineItemPageIndex(spineItem, itemPageIndex)
            ?.absolutePageIndex,
  }
}

/**
 * A located cfi, with what it was read on: the published pages, and the
 * document of its item while the item was ready. While both stay the same,
 * reading the cfi again gives the same values.
 */
type CfiReading = {
  meta: ConsolidatedResource
  publishedPages: PagesState
  document: Document | undefined
}

/** The document a cfi of the item resolves in: only a ready item gives one. */
const getReadableDocument = (spineItem: SpineItem | undefined) =>
  spineItem?.value.isReady ? spineItem.loadedDocument : undefined

type Options = {
  /**
   * does not load document if shallow
   */
  mode?: "shallow" | "load"
}

export class ResourcesLocator {
  /**
   * One consolidation per cfi, shared by every resource located at that cfi.
   * It outlives its last subscriber until the next microtask: a list located
   * again synchronously, as a `switchMap` does when the list changes, keeps
   * the consolidations of the cfis it still holds.
   */
  private consolidationsByCfi = new Map<
    string,
    Observable<ConsolidatedResource>
  >()

  /**
   * The idle callback a consolidation first reads on, shared by every
   * consolidation that starts before it fires. One that starts while it fires,
   * from a subscriber of another one's first reading, gets it too.
   */
  private readonly nextIdle$ = idle().pipe(
    share({ connector: () => new ReplaySubject(1) }),
  )

  /**
   * Emits on an idle callback after anything that can move a located
   * resource: published pages, or a loaded item that starts to unload. A cfi
   * of an item that unloads loses its page without waiting for the pages its
   * unload leads to. An item becomes ready only as a layout lays it out, and
   * the pages of that layout are published after. Every consolidation runs on
   * this one callback, which lets a list emit once for it.
   */
  private readonly relocation$: Observable<unknown>

  constructor(private reader: Reader) {
    this.relocation$ = merge(
      reader.spine.layout$,
      reader.spine.spineItemsObserver.itemLoadStatusChange$.pipe(
        filter(({ previousLoadStatus }) => previousLoadStatus === "loaded"),
      ),
    ).pipe(
      debounceTime(10),
      switchMap(() => idle()),
      share(),
    )
  }

  private getOrCreateConsolidation = (cfiToLocate: CfiToLocate) => {
    const { cfi, spineItem } = cfiToLocate
    const existingConsolidation$ = this.consolidationsByCfi.get(cfi)

    if (existingConsolidation$) return existingConsolidation$

    /**
     * A reading stays while its pages and its item's document do. While a
     * pending layout can change the item, a cfi read on the published pages
     * keeps their values until the next ones are published.
     */
    const consolidation$ = merge(this.nextIdle$, this.relocation$).pipe(
      scan<unknown, CfiReading, undefined>((previous) => {
        const publishedPages = this.reader.spine.pages.value
        const document = getReadableDocument(spineItem)

        if (
          previous?.publishedPages === publishedPages &&
          previous.document === document
        ) {
          return previous
        }

        return {
          meta: readCfi(cfiToLocate, this.reader),
          publishedPages,
          document,
        }
      }, undefined),
      map(({ meta }) => meta),
      // A reading that stays emits nothing.
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

  private locate = <T extends LocatableResource>(
    resource: T,
    options: Options,
  ): Observable<{ resource: T; meta: ConsolidatedResource }> => {
    const cfi = getLocatableResourceCfi(this.reader, resource)
    const parsedCfi = this.reader.cfi.parseCfi(cfi)
    const item = this.reader.spineItemsManager.get(parsedCfi.itemIndex)
    const cfiToLocate: CfiToLocate = {
      cfi,
      parsedCfi,
      isCfiOfItemStart: this.reader.cfi.isRootCfi(cfi),
      spineItem: item,
    }

    return defer(() => {
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
        /**
         * `combineLatest` emits once for each consolidation that reads, and
         * they read on the same callback: this makes one emission of them.
         */
        debounceTime(0, asapScheduler),
        defaultIfEmpty([]),
        takeUntil(this.reader.$.destroy$),
      )
    }

    return this.locate(resource, options ?? {})
  }
}
