import { isShallowEqual, type Reader } from "@prose-reader/core"
import {
  debounceTime,
  distinctUntilChanged,
  map,
  merge,
  NEVER,
  shareReplay,
  switchMap,
  takeUntil,
  tap,
} from "rxjs"
import { ReaderHighlights } from "./annotations/ReaderHighlights.ts"
import type { RuntimeAnnotation } from "./annotations/types.ts"
import { report } from "./report.ts"
import { Settings } from "./Settings.ts"
import type {
  AnnotateAbsolutePageParams,
  AnnotateSelectionParams,
  Annotation,
  AnnotationsEnhancerAPI,
  AnnotationsEnhancerOptions,
} from "./types.ts"

export type { AnnotationsEnhancerAPI }

export const annotationsEnhancer =
  <InheritOptions, InheritOutput extends Reader>(
    next: (options: InheritOptions) => InheritOutput,
  ) =>
  (
    options: InheritOptions & { annotations?: AnnotationsEnhancerOptions },
  ): InheritOutput & AnnotationsEnhancerAPI => {
    const { annotations: annotationsOptions, ...rest } = options
    const settings = new Settings({
      annotations$: annotationsOptions?.annotations$,
    })
    const reader = next(rest as InheritOptions)

    const annotations$ = settings
      .watch("annotations$")
      .pipe(switchMap((annotations) => annotations ?? NEVER))

    const runtimeAnnotations$ = annotations$.pipe(
      distinctUntilChanged(isShallowEqual),
      map((annotations) => {
        const runtimeAnnotations: RuntimeAnnotation[] = annotations.map(
          (annotation) => {
            const { itemIndex = 0 } = reader.cfi.parseCfi(annotation.cfi ?? "")

            const highlight = {
              ...annotation,
              itemIndex,
            } satisfies RuntimeAnnotation

            return highlight
          },
        )

        return runtimeAnnotations
      }),
      tap((annotations) => {
        report.debug("annotations", annotations)
      }),
      shareReplay({
        refCount: true,
        bufferSize: 1,
      }),
    )

    const selectedHighlight$ = runtimeAnnotations$.pipe(
      map(
        (annotations) =>
          annotations.find((annotation) => annotation.selected)?.id,
      ),
      distinctUntilChanged(),
      shareReplay({ refCount: true, bufferSize: 1 }),
    )

    const readerHighlights = new ReaderHighlights(
      reader,
      runtimeAnnotations$,
      selectedHighlight$,
    )

    const generateCfiForSelection = ({
      itemIndex,
      selection,
    }: AnnotateSelectionParams) => {
      const spineItem = reader.spineItemsManager.get(itemIndex)

      if (!spineItem) return undefined

      const range = reader.selection.createOrderedRangeFromSelection({
        selection,
        spineItem,
      })

      return range
        ? reader.cfi.generateCfiFromRange(range, spineItem.item)
        : undefined
    }

    const generateCfiForAbsolutePage = ({
      absolutePageIndex,
    }: AnnotateAbsolutePageParams) => {
      const pageEntry =
        reader.spine.pages.fromAbsolutePageIndex(absolutePageIndex)
      const spineItem = reader.spineItemsManager.get(pageEntry?.itemIndex)

      if (!pageEntry || !spineItem) return undefined

      return pageEntry.firstVisibleNode
        ? reader.cfi.generateCfiForSpineItemPage({
            spineItem: spineItem.item,
            pageNode: pageEntry.firstVisibleNode,
          })
        : reader.cfi.generateRootCfi(spineItem.item)
    }

    const createAnnotation = (
      params: AnnotateSelectionParams | AnnotateAbsolutePageParams,
    ): Pick<Annotation, "id" | "cfi"> | undefined => {
      const cfi =
        "selection" in params
          ? generateCfiForSelection(params)
          : generateCfiForAbsolutePage(params)

      return cfi === undefined
        ? undefined
        : { id: window.crypto.randomUUID(), cfi }
    }

    const renderAnnotations$ = merge(runtimeAnnotations$, reader.layout$).pipe(
      debounceTime(50),
      switchMap(() => readerHighlights.layout()),
    )

    /**
     * One entry per published page, so an empty array while the reader has
     * published none: a consumer reading it with `withLatestFrom` gets a
     * value at once. That holds because `layoutInfo$` replays the current
     * pages, which the layout enhancer keeps subscribed.
     */
    const candidates$ = reader.layoutInfo$.pipe(
      map(({ pages }) =>
        pages.map((page) => {
          const item = reader.spineItemsManager.get(page.itemIndex)

          if (!item) return false

          // pre-paginated can always be annotated on their unique page
          if (item.renditionLayout === "pre-paginated") return true

          return page.firstVisibleNode !== undefined
        }),
      ),
    )

    merge(renderAnnotations$, annotations$)
      .pipe(takeUntil(reader.$.destroy$))
      .subscribe()

    return {
      ...reader,
      __PROSE_READER_ENHANCER_ANNOTATIONS: true,
      destroy: () => {
        readerHighlights.destroy()
        reader.destroy()
      },
      annotations: {
        annotations$: runtimeAnnotations$,
        highlightTap$: readerHighlights.tap$,
        candidates$,
        isTargetWithinHighlight: readerHighlights.isTargetWithinHighlight,
        createAnnotation,
        update: settings.update.bind(settings),
      },
    }
  }
