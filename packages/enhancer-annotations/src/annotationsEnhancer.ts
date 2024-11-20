import { Reader } from "@prose-reader/core"
import { BehaviorSubject, merge, takeUntil, tap, Observable } from "rxjs"
import { report } from "./report"
import { RuntimeHighlight } from "./types"
import { ReaderHighlights } from "./highlights/ReaderHighlights"
import { Commands } from "./Commands"

export const annotationsEnhancer =
  <InheritOptions, InheritOutput extends Reader>(next: (options: InheritOptions) => InheritOutput) =>
  (
    options: InheritOptions,
  ): InheritOutput & {
    annotations: {
      annotations$: Observable<RuntimeHighlight[]>
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
    const highlightsSubject = new BehaviorSubject<RuntimeHighlight[]>([])
    const selectedHighlightSubject = new BehaviorSubject<string | undefined>(undefined)

    const readerHighlights = new ReaderHighlights(reader, highlightsSubject, selectedHighlightSubject)

    const highlight$ = commands.highlight$.pipe(
      tap(({ data: { itemId, selection, ...rest } }) => {
        const { anchorCfi, focusCfi } = reader.selection.generateCfis({ itemId, selection })

        const annotation = { anchorCfi, focusCfi, itemId, id: window.crypto.randomUUID(), ...rest }

        highlightsSubject.next([...highlightsSubject.getValue(), annotation])
      }),
    )

    const add$ = commands.add$.pipe(
      tap(({ data }) => {
        const annotations = Array.isArray(data) ? data : [data]

        highlightsSubject.next([...highlightsSubject.getValue(), ...annotations])
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
          highlightsSubject.getValue().map((highlight) => (highlight.id === id ? { ...highlight, ...data } : highlight)),
        )
      }),
    )

    const select$ = commands.select$.pipe(
      tap(({ id }) => {
        selectedHighlightSubject.next(id)
      }),
    )

    const annotations$ = highlightsSubject.asObservable()

    merge(
      highlight$,
      add$,
      delete$,
      update$,
      select$,
      annotations$.pipe(
        tap((annotations) => {
          report.debug("annotations", annotations)
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
        annotations$,
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
