import { Reader } from "@prose-reader/core"
import { BehaviorSubject, merge, takeUntil, tap, Observable } from "rxjs"
import { report } from "./report"
import { ReaderHighlights } from "./highlights/ReaderHighlights"
import { Commands } from "./Commands"
import { Highlight } from "./highlights/Highlight"

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
      tap(({ data: { itemId, selection, ...rest } }) => {
        const { anchorCfi, focusCfi } = reader.selection.generateCfis({ itemId, selection })

        const highlight = new Highlight({ anchorCfi, focusCfi, itemId, id: window.crypto.randomUUID(), ...rest })

        highlightsSubject.next([...highlightsSubject.getValue(), highlight])
      }),
    )

    const add$ = commands.add$.pipe(
      tap(({ data }) => {
        const annotations = Array.isArray(data) ? data : [data]

        highlightsSubject.next([...highlightsSubject.getValue(), ...annotations.map((annotation) => new Highlight(annotation))])
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

    merge(
      highlight$,
      add$,
      delete$,
      update$,
      select$,
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
