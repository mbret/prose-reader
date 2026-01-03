import { isDefined, type Reader } from "@prose-reader/core"
import {
  BehaviorSubject,
  combineLatest,
  debounceTime,
  distinctUntilChanged,
  filter,
  map,
  merge,
  of,
  share,
  shareReplay,
  switchMap,
  takeUntil,
  tap,
} from "rxjs"
import { ReaderHighlights } from "./annotations/ReaderHighlights"
import type { RuntimeAnnotation } from "./annotations/types"
import { Commands } from "./Commands"
import { report } from "./report"
import type { AnnotationsEnhancerAPI } from "./types"

export type { AnnotationsEnhancerAPI }

export const annotationsEnhancer =
  <InheritOptions, InheritOutput extends Reader>(
    next: (options: InheritOptions) => InheritOutput,
  ) =>
  (options: InheritOptions): InheritOutput & AnnotationsEnhancerAPI => {
    const reader = next(options)
    const commands = new Commands()
    const annotationsSubject = new BehaviorSubject<RuntimeAnnotation[]>([])
    const selectedHighlightSubject = new BehaviorSubject<string | undefined>(
      undefined,
    )

    const annotations$ = annotationsSubject.asObservable().pipe(
      distinctUntilChanged(),
      tap((annotations) => {
        report.debug("annotations", annotations)
      }),
      shareReplay({
        refCount: true,
        bufferSize: 1,
      }),
    )

    const readerHighlights = new ReaderHighlights(
      reader,
      annotationsSubject,
      selectedHighlightSubject,
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

    const annotated$ = commands.annotate$.pipe(
      map(({ data: { selection, ...rest } }) => {
        const { itemIndex, pageIndex = 0 } = resolveItemInformation(rest) ?? {}
        const spineItem = reader.spineItemsManager.get(itemIndex)

        if (!spineItem) return undefined

        const range = selection
          ? reader.selection.createOrderedRangeFromSelection({
              selection,
              spineItem,
            })
          : undefined

        const cfi = range
          ? reader.cfi.generateCfiFromRange(range, spineItem.item)
          : reader.cfi.generateCfiForSpineItemPage({ pageIndex, spineItem })

        const highlight = {
          cfi,
          itemIndex: spineItem.index,
          id: window.crypto.randomUUID(),
          ...rest,
        } satisfies RuntimeAnnotation

        annotationsSubject.next([...annotationsSubject.getValue(), highlight])

        return [highlight.id]
      }),
      filter(isDefined),
      share(),
    )

    const add$ = commands.add$.pipe(
      map(({ data }) => {
        const annotations = Array.isArray(data) ? data : [data]

        const addedHighlights = annotations.map((annotation) => {
          const { itemIndex = 0 } = reader.cfi.parseCfi(annotation.cfi ?? "")

          const highlight = {
            ...annotation,
            itemIndex,
          } satisfies RuntimeAnnotation

          return highlight
        })

        annotationsSubject.next([
          ...annotationsSubject.getValue(),
          ...addedHighlights,
        ])
      }),
    )

    const delete$ = commands.delete$.pipe(
      tap(({ id }) => {
        annotationsSubject.next(
          annotationsSubject.value.filter((highlight) => highlight.id !== id),
        )
      }),
    )

    const update$ = commands.update$.pipe(
      tap(({ id, data }) => {
        annotationsSubject.next(
          annotationsSubject.getValue().map((highlight) => {
            return highlight.id === id ? { ...highlight, ...data } : highlight
          }),
        )
      }),
    )

    const select$ = commands.select$.pipe(
      tap(({ id }) => {
        selectedHighlightSubject.next(id)
      }),
    )

    const reset$ = commands.reset$.pipe(
      tap(() => {
        annotationsSubject.next([])
      }),
    )

    const renderAnnotations$ = merge(annotations$, reader.layout$).pipe(
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

    merge(
      annotated$,
      add$,
      delete$,
      update$,
      select$,
      reset$,
      renderAnnotations$,
      annotations$,
    )
      .pipe(takeUntil(reader.$.destroy$))
      .subscribe()

    return {
      ...reader,
      __PROSE_READER_ENHANCER_ANNOTATIONS: true,
      destroy: () => {
        annotationsSubject.complete()
        commands.destroy()
        readerHighlights.destroy()
        reader.destroy()
      },
      annotations: {
        annotations$: annotations$,
        highlightTap$: readerHighlights.tap$,
        candidates$,
        isTargetWithinHighlight: readerHighlights.isTargetWithinHighlight,
        annotate: commands.annotate,
        annotateAbsolutePage: commands.annotateAbsolutePage,
        add: commands.add,
        delete: commands.delete,
        update: commands.update,
        select: commands.select,
        reset: commands.reset,
      },
    }
  }
