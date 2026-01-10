import {
  generateRootCfi,
  isShallowEqual,
  type Reader,
} from "@prose-reader/core"
import {
  combineLatest,
  debounceTime,
  distinctUntilChanged,
  map,
  merge,
  NEVER,
  of,
  shareReplay,
  switchMap,
  takeUntil,
  tap,
} from "rxjs"
import { ReaderHighlights } from "./annotations/ReaderHighlights"
import type { RuntimeAnnotation } from "./annotations/types"
import { report } from "./report"
import { Settings } from "./Settings"
import type {
  AnnotateAbsolutePageParams,
  AnnotateParams,
  AnnotationsEnhancerAPI,
  AnnotationsEnhancerOptions,
} from "./types"

export type { AnnotationsEnhancerAPI }

export const annotationsEnhancer =
  <InheritOptions, InheritOutput extends Reader>(
    next: (options: InheritOptions) => InheritOutput,
  ) =>
  (
    options: InheritOptions & { annotations: AnnotationsEnhancerOptions },
  ): InheritOutput & AnnotationsEnhancerAPI => {
    const { annotations: annotationsOptions, ...rest } = options
    const settings = new Settings({
      annotations$: annotationsOptions.annotations$,
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

    const resolveItemInformation = (params: {
      absolutePageIndex?: number
      itemIndex?: number
    }) => {
      if (params.itemIndex !== undefined)
        return { itemIndex: params.itemIndex, pageIndex: undefined }

      if (params.absolutePageIndex !== undefined) {
        return reader.spine.pages.fromAbsolutePageIndex(
          params.absolutePageIndex,
        )
      }

      return undefined
    }

    const createAnnotation = ({
      selection,
      ...rest
    }: (AnnotateParams | AnnotateAbsolutePageParams) & {
      absolutePageIndex?: number
    }) => {
      const { itemIndex, pageIndex = 0 } = resolveItemInformation(rest) ?? {}
      const spineItem = reader.spineItemsManager.get(itemIndex)
      const id = window.crypto.randomUUID()

      if (!spineItem) return undefined

      const range = selection
        ? reader.selection.createOrderedRangeFromSelection({
            selection,
            spineItem,
          })
        : undefined

      const pageEntry = reader.spine.pages.fromSpineItemPageIndex(
        spineItem,
        pageIndex,
      )

      const cfiWithRangeOrFirstNodeOrRoot = range
        ? reader.cfi.generateCfiFromRange(range, spineItem.item)
        : pageEntry?.firstVisibleNode
          ? reader.cfi.generateCfiForSpineItemPage({
              spineItem: spineItem.item,
              pageNode: pageEntry.firstVisibleNode,
            })
          : generateRootCfi(spineItem.item)

      const highlight = {
        cfi: cfiWithRangeOrFirstNodeOrRoot,
        itemIndex: spineItem.index,
        id,
        ...rest,
      } satisfies RuntimeAnnotation

      return highlight
    }

    const renderAnnotations$ = merge(runtimeAnnotations$, reader.layout$).pipe(
      debounceTime(50),
      switchMap(() => readerHighlights.layout()),
    )

    const candidates$ = reader.layoutInfo$.pipe(
      switchMap(({ pages }) =>
        combineLatest(
          pages.map((page) => {
            const item = reader.spineItemsManager.get(page.itemIndex)

            if (!item) return of(false)

            // pre-paginated can always be annotated on their unique page
            if (item.renditionLayout === "pre-paginated") return of(true)

            if (page.firstVisibleNode) return of(true)

            return of(false)
          }),
        ),
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
