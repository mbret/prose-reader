import {
  BehaviorSubject,
  distinctUntilChanged,
  filter,
  first,
  fromEvent,
  ignoreElements,
  map,
  merge,
  Observable,
  share,
  shareReplay,
  switchMap,
  takeUntil,
  tap,
  withLatestFrom,
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
      selectionStart$: Observable<boolean>
      selectionEnd$: Observable<void>
      selectionUp$: Observable<[Event, SelectionValue]>
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
                    selectionSubject.next({
                      document: frameDoc,
                      selection,
                      itemId,
                    })
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
      shareReplay(1),
      takeUntil(reader.$.destroy$),
    )

    const selectionStart$ = selectionSubject.pipe(
      map((selection) => !!selection),
      distinctUntilChanged(),
      filter((isSelecting) => isSelecting),
      share(),
    )

    const selectionEnd$ = selectionStart$.pipe(
      switchMap(() => selection$),
      distinctUntilChanged(),
      filter((selection) => !selection),
    )

    const selectionUp$ = selectionStart$.pipe(
      withLatestFrom(reader.context.containerElement$),
      switchMap(([, container]) =>
        fromEvent(container, "pointerup").pipe(
          first(),
          withLatestFrom(selection$),
          filter((selection) => !!selection),
        ),
      ),
    )

    return {
      ...reader,
      selection: {
        selection$,
        selectionStart$,
        selectionEnd$,
        selectionUp$,
        generateCfis,
      },
      destroy: () => {
        selectionSubject.complete()

        reader.destroy()
      },
    }
  }
