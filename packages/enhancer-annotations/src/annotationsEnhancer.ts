import { Reader } from "@prose-reader/core"
import {
  BehaviorSubject,
  merge,
  takeUntil,
  tap,
  Observable,
  debounceTime,
  filter,
  mergeMap,
  map,
  share,
  distinctUntilChanged,
  withLatestFrom,
  forkJoin,
} from "rxjs"
import { report } from "./report"
import { ReaderHighlights } from "./highlights/ReaderHighlights"
import { Commands } from "./Commands"
import { Highlight } from "./highlights/Highlight"
import { consolidate } from "./highlights/consolidate"
import { isDefined } from "reactjrx"

export const annotationsEnhancer =
  <InheritOptions, InheritOutput extends Reader>(next: (options: InheritOptions) => InheritOutput) =>
  (
    options: InheritOptions,
  ): InheritOutput & {
    annotations: {
      highlights$: Observable<Highlight[]>
      highlightTap$: ReaderHighlights["tap$"]
      highlight: Commands["highlight"]
      add: Commands["add"]
      delete: Commands["delete"]
      update: Commands["update"]
      select: Commands["select"]
      isTargetWithinHighlight: (target: EventTarget) => boolean
    }
  } => {
    const reader = next(options)
    const commands = new Commands()
    const highlightsSubject = new BehaviorSubject<Highlight[]>([])
    const selectedHighlightSubject = new BehaviorSubject<string | undefined>(undefined)

    const highlights$ = highlightsSubject.asObservable().pipe(distinctUntilChanged())

    const readerHighlights = new ReaderHighlights(reader, highlightsSubject, selectedHighlightSubject)

    const highlighted$ = commands.highlight$.pipe(
      map(({ data: { itemIndex, selection, ...rest } }) => {
        const spineItem = reader.spineItemsManager.get(itemIndex)

        if (!spineItem) return undefined

        const range = reader.selection.createOrderedRangeFromSelection({ selection, spineItem })

        if (!range) return undefined

        const { start: startCfi, end: endCfi } = reader.cfi.generateCfiFromRange(range, spineItem.item)

        const highlight = new Highlight({
          cfi: startCfi,
          endCfi,
          itemIndex,
          id: window.crypto.randomUUID(),
          ...rest,
        })

        highlightsSubject.next([...highlightsSubject.getValue(), highlight])

        return [highlight.id]
      }),
      filter(isDefined),
      share(),
    )

    const add$ = commands.add$.pipe(
      map(({ data }) => {
        const annotations = Array.isArray(data) ? data : [data]

        const addedHighlights = annotations.map((annotation) => {
          const { itemIndex } = reader.cfi.parseCfi(annotation.cfi ?? "")

          const highlight = new Highlight({ ...annotation, itemIndex })

          return highlight
        })

        highlightsSubject.next([...highlightsSubject.getValue(), ...addedHighlights])
      }),
    )

    const delete$ = commands.delete$.pipe(
      tap(({ id }) => {
        highlightsSubject.next(highlightsSubject.getValue().filter((highlight) => highlight.id !== id))
      }),
    )

    const update$ = commands.update$.pipe(
      tap(({ id, data }) => {
        highlightsSubject.next(
          highlightsSubject.getValue().map((highlight) => {
            return highlight.id === id ? highlight.update(data) : highlight
          }),
        )
      }),
    )

    const select$ = commands.select$.pipe(
      tap(({ id }) => {
        selectedHighlightSubject.next(id)
      }),
    )

    const highlightsConsolidation$ = merge(highlighted$, reader.layout$).pipe(
      debounceTime(50),
      withLatestFrom(highlights$),
      mergeMap(() => forkJoin(highlightsSubject.value.map((highlight) => consolidate(highlight, reader)))),
      tap((consolidatedHighlights) => {
        const consolidatedExistingHighlights = highlightsSubject.value.map(
          (highlight) => consolidatedHighlights.find((c) => c.id === highlight.id) ?? highlight,
        )

        highlightsSubject.next(consolidatedExistingHighlights)

        readerHighlights.layout()
      }),
    )

    merge(
      highlighted$,
      add$,
      delete$,
      update$,
      select$,
      highlightsConsolidation$,
      highlights$.pipe(
        tap((annotations) => {
          report.debug("highlights", annotations)
        }),
      ),
    )
      .pipe(takeUntil(reader.$.destroy$))
      .subscribe()

    return {
      ...reader,
      destroy: () => {
        highlightsSubject.complete()
        commands.destroy()
        readerHighlights.destroy()
        reader.destroy()
      },
      annotations: {
        highlights$,
        highlightTap$: readerHighlights.tap$,
        isTargetWithinHighlight: readerHighlights.isTargetWithinHighlight,
        highlight: commands.highlight,
        add: commands.add,
        delete: commands.delete,
        update: commands.update,
        select: commands.select,
      },
    }
  }
