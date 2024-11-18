import { Reader } from "@prose-reader/core"
import { BehaviorSubject, filter, merge, Observable, Subject, takeUntil, tap, withLatestFrom } from "rxjs"
import { report } from "./report"
import { Highlight, RuntimeHighlight } from "./types"
import { AnnotationLayers } from "./layers/AnnotationLayers"

type Command = { type: "save" } | { type: "add"; data: Highlight | Highlight[] }

export const annotationsEnhancer =
  <InheritOptions, InheritOutput extends Reader>(next: (options: InheritOptions) => InheritOutput) =>
  (
    options: InheritOptions,
  ): InheritOutput & {
    annotations: {
      annotations$: Observable<RuntimeHighlight[]>
      save: () => void
      add: (data: Highlight | Highlight[]) => void
      getHighlightsForTarget: (target: EventTarget) => RuntimeHighlight[]
    }
  } => {
    const reader = next(options)
    const commandSubject = new Subject<Command>()
    const annotationsSubject = new BehaviorSubject<RuntimeHighlight[]>([])

    const save$ = commandSubject.pipe(
      filter((command) => command.type === "save"),
      withLatestFrom(reader.selection.selection$),
      tap(([, selection]) => {
        if (selection) {
          const { anchorCfi, focusCfi } = reader.selection.generateCfis(selection)

          const annotation = { anchorCfi, focusCfi, itemId: selection.itemId, id: window.crypto.randomUUID() }

          annotationsSubject.next([...annotationsSubject.getValue(), annotation])
        }
      }),
    )

    const add$ = commandSubject.pipe(
      filter((command) => command.type === "add"),
      tap(({ data }) => {
        const annotations = Array.isArray(data) ? data : [data]

        annotationsSubject.next([...annotationsSubject.getValue(), ...annotations])
      }),
    )

    const annotations$ = annotationsSubject.asObservable()

    const annotationLayers = new AnnotationLayers(reader, annotationsSubject)

    merge(
      save$,
      add$,
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
        annotationsSubject.complete()
        commandSubject.complete()
        annotationLayers.destroy()
        reader.destroy()
      },
      annotations: {
        annotations$,
        getHighlightsForTarget: (target: EventTarget) => {
          return annotationLayers.getHighlightsForTarget(target)
        },
        save: () => {
          commandSubject.next({ type: "save" })
        },
        add: (data: Highlight | Highlight[]) => {
          commandSubject.next({ type: "add", data })
        },
      },
    }
  }
