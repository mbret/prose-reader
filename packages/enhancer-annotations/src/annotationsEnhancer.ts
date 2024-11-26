import { Reader } from "@prose-reader/core"
import {
  BehaviorSubject,
  merge,
  takeUntil,
  tap,
  Observable,
  debounceTime,
  combineLatest,
  filter,
  mergeMap,
  map,
  share,
  buffer,
  distinctUntilChanged,
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
    const readerHighlights = new ReaderHighlights(reader, highlightsSubject, selectedHighlightSubject)

    const highlight$ = commands.highlight$.pipe(
      map(({ data: { itemIndex, selection, ...rest } }) => {
        const item = reader.spineItemsManager.get(itemIndex)?.item

        if (!item) return undefined

        const { anchorCfi, focusCfi } = reader.cfi.generateCfiFromSelection({ item, selection })

        const highlight = new Highlight({ anchorCfi, focusCfi, itemIndex, id: window.crypto.randomUUID(), ...rest })

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
          const { itemIndex } = reader.cfi.parseCfi(annotation.anchorCfi ?? "")

          const highlight = new Highlight({ ...annotation, itemIndex })

          return highlight
        })

        highlightsSubject.next([...highlightsSubject.getValue(), ...addedHighlights])

        return addedHighlights.map((highlight) => highlight.id)
      }),
      share(),
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

    const highlights$ = highlightsSubject.asObservable().pipe(
      distinctUntilChanged()
    )

    const highlightsToConsolidate$ = merge(
      add$,
      highlight$,
      reader.layout$.pipe(map(() => highlightsSubject.value.map(({ id }) => id))),
    ).pipe(share())

    const highlightsConsolidation$ = highlightsToConsolidate$.pipe(
      buffer(highlightsToConsolidate$.pipe(debounceTime(100))),
      map((arrays) => {
        const ids = Array.from(new Set(arrays.flat()))

        return highlightsSubject.value.filter((highlight) => ids.includes(highlight.id))
      }),
      mergeMap((highlightsToConsolidate) => {
        report.debug("consolidating", highlightsToConsolidate)

        return combineLatest(highlightsToConsolidate.map((highlight) => consolidate(highlight, reader)))
      }),
      tap((consolidatedHighlights) => {
        const consolidatedExistingHighlights = highlightsSubject.value.map(
          (highlight) => consolidatedHighlights.find((c) => c.id === highlight.id) ?? highlight,
        )

        highlightsSubject.next(consolidatedExistingHighlights)

        readerHighlights.layout()
      }),
    )

    merge(
      highlight$,
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
