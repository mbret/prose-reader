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
  startWith,
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

export const selectionEnhancer =
  <InheritOptions, InheritOutput extends EnhancerOutput<RootEnhancer>>(
    next: (options: InheritOptions) => InheritOutput,
  ) =>
  (
    options: InheritOptions,
  ): InheritOutput & {
    selection: {
      /**
       * Emits the current selection.
       */
      selection$: Observable<SelectionValue>
      /**
       * Emits when user starts a selection.
       */
      selectionStart$: Observable<boolean>
      /**
       * Emits when user ends a selection.
       */
      selectionEnd$: Observable<void>
      /**
       * Emits when user releases the pointer after a selection.
       */
      selectionUp$: Observable<[Event, SelectionValue]>
      /**
       * Usefull to know about the last selection before a pointerdown event.
       * For example if you want to prevent certain action on click if user is discarding a selection.
       * A good example is delaying the opening of a reader menu.
       */
      lastSelectionOnPointerdown$: Observable<SelectionValue | undefined>
      /**
       * Generate CFIs from a selection.
       * It can come handy when you want to store selections (eg: highlights).
       */
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

    const lastSelectionOnPointerdown$ = reader.context.containerElement$.pipe(
      switchMap((container) => fromEvent(container, "pointerdown")),
      withLatestFrom(selection$),
      map(([, selection]) => selection),
      startWith(undefined),
    )

    return {
      ...reader,
      selection: {
        selection$,
        selectionStart$,
        selectionEnd$,
        selectionUp$,
        lastSelectionOnPointerdown$,
        generateCfis,
      },
      destroy: () => {
        selectionSubject.complete()

        reader.destroy()
      },
    }
  }
