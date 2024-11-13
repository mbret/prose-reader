import {
  BehaviorSubject,
  distinctUntilChanged,
  fromEvent,
  ignoreElements,
  map,
  merge,
  Observable,
  shareReplay,
  takeUntil,
  tap,
} from "rxjs"
import { EnhancerOutput, RootEnhancer } from "../types/enhancer"
import { generateCfis } from "./selection"

type SelectionValue =
  | {
      document: Document
      selection: Selection
      itemId: string
    }
  | undefined

/**
 *
 */
export const selectionEnhancer =
  <InheritOptions, InheritOutput extends EnhancerOutput<RootEnhancer>>(
    next: (options: InheritOptions) => InheritOutput,
  ) =>
  (
    options: InheritOptions,
  ): InheritOutput & {
    selection: {
      selection$: Observable<SelectionValue>
      generateCfis: (params: { itemId: string; selection: Selection }) => {
        anchorCfi: string | undefined
        focusCfi: string | undefined
      }
    }
  } => {
    const reader = next(options)

    const selectionSubject = new BehaviorSubject<SelectionValue>(undefined)

    reader.hookManager.register(
      `item.onDocumentLoad`,
      ({ itemId, layers, destroy$ }) => {
        const frame = layers[0]?.element

        if (frame instanceof HTMLIFrameElement) {
          const frameDoc =
            frame.contentDocument || frame.contentWindow?.document

          if (frameDoc) {
            const pointerUp$ = fromEvent(frameDoc, "pointerup").pipe(
              tap(() => {
                const selection = frameDoc.getSelection()
                if (selection && selection.toString()) {
                  console.log("Selection finished:", selection.toString())
                }
              }),
              ignoreElements(),
            )

            const selectionChange$ = fromEvent(
              frameDoc,
              "selectionchange",
            ).pipe(map(() => frameDoc.getSelection()))

            merge(pointerUp$, selectionChange$)
              .pipe(
                tap((selection) => {
                  if (selection?.toString()) {
                    selectionSubject.next({ document: frameDoc, selection, itemId })
                  } else {
                    selectionSubject.next(undefined)
                  }
                }),
                takeUntil(destroy$),
              )
              .subscribe()
          }
        }
      },
    )

    const selection$ = selectionSubject.pipe(
      distinctUntilChanged(),
      tap((data) => {
        console.log("FOOO selection", data)
      }),
      shareReplay(1),
      takeUntil(reader.$.destroy$),
    )

    return {
      ...reader,
      selection: {
        selection$,
        generateCfis,
      },
      destroy: () => {
        selectionSubject.complete()

        reader.destroy()
      },
    }
  }
