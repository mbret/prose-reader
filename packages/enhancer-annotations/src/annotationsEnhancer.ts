import { Reader } from "@prose-reader/core"
import { BehaviorSubject, merge, takeUntil, tap, Observable, withLatestFrom } from "rxjs"
import { report } from "./report"
import { ReaderHighlights } from "./highlights/ReaderHighlights"
import { Commands } from "./Commands"
import { Highlight } from "./highlights/Highlight"
import { consolidate } from "./highlights/consolidate"

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
      tap(({ data: { itemIndex, selection, ...rest } }) => {
        const { anchorCfi, focusCfi } = reader.selection.generateCfis({ itemIndex, selection })

        const highlight = new Highlight({ anchorCfi, focusCfi, itemIndex, id: window.crypto.randomUUID(), ...rest })

        consolidate(highlight, reader)

        highlightsSubject.next([...highlightsSubject.getValue(), highlight])
      }),
    )

    const add$ = commands.add$.pipe(
      tap(({ data }) => {
        const annotations = Array.isArray(data) ? data : [data]

        highlightsSubject.next([
          ...highlightsSubject.getValue(),
          ...annotations.map((annotation) => {
            const { itemIndex } = reader.cfi.parseCfi(annotation.anchorCfi ?? "")

            const highlight = new Highlight({ ...annotation, itemIndex })

            consolidate(highlight, reader)

            return highlight
          }),
        ])
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
          highlightsSubject
            .getValue()
            .map((highlight) => (highlight.id === id ? new Highlight({ ...highlight, ...data }) : highlight)),
        )
      }),
    )

    const select$ = commands.select$.pipe(
      tap(({ id }) => {
        selectedHighlightSubject.next(id)
      }),
    )

    const highlights$ = highlightsSubject.asObservable()

    /**
     * @todo consolidation should be more optimized
     */
    const highlightsConsolidation$ = reader.layout$.pipe(
      withLatestFrom(highlights$),
      tap(([, highlights]) => {
        highlights.forEach((highlight) => consolidate(highlight, reader))

        highlightsSubject.next(highlights)
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
