import { Reader } from "@prose-reader/core"
import { BehaviorSubject, filter, merge, Subject, takeUntil, tap, withLatestFrom } from "rxjs"
import { report } from "./report"

type Command = { type: "save" }
type RuntimeAnnotation = {
  anchorCfi: string | undefined
  focusCfi: string | undefined
  itemId: string
  /**
   * Unique local ID. This is to ensure unicity
   * for duplicate selections
   */
  id: string
}

export const annotationsEnhancer =
  <InheritOptions, InheritOutput extends Reader>(next: (options: InheritOptions) => InheritOutput) =>
  (
    options: InheritOptions,
  ): InheritOutput & {
    annotations: {
      save: () => void
    }
  } => {
    const reader = next(options)
    const commandSubject = new Subject<Command>()
    const bookmarksSubject = new BehaviorSubject<RuntimeAnnotation[]>([])

    const save$ = commandSubject.pipe(
      filter((command) => command.type === "save"),
      withLatestFrom(reader.selection.selection$),
      tap(([, selection]) => {
        if (selection) {
          const { anchorCfi, focusCfi } = reader.selection.generateCfis(selection)

          const annotation = { anchorCfi, focusCfi, itemId: selection.itemId, id: window.crypto.randomUUID() }

          bookmarksSubject.next([...bookmarksSubject.getValue(), annotation])
        }
      }),
    )

    const annotations$ = bookmarksSubject.asObservable()

    merge(
      save$,
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
        bookmarksSubject.complete()
        commandSubject.complete()

        reader.destroy()
      },
      annotations: {
        save: () => {
          commandSubject.next({ type: "save" })
        },
      },
    }
  }
