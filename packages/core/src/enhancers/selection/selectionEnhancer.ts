import {
  BehaviorSubject,
  distinctUntilChanged,
  filter,
  fromEvent,
  map,
  merge,
  Observable,
  share,
  shareReplay,
  startWith,
  Subject,
  switchMap,
  takeUntil,
  tap,
  withLatestFrom,
} from "rxjs"
import { EnhancerOutput, RootEnhancer } from "../types/enhancer"
import { createOrderedRangeFromSelection } from "./selection"
import { SelectionTracker } from "./SelectionTracker"
import { SpineItem } from "../.."

type SelectionValue =
  | {
      document: Document
      selection: Selection
      itemIndex: number
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
      selectionAfterPointerUp$: Observable<[Event, SelectionValue]>
      /**
       * Usefull to know about the selection state before a pointerdown event.
       * For example if you want to prevent certain action on click if user is discarding a selection.
       * A good example is delaying the opening of a reader menu.
       */
      lastSelectionOnPointerdown$: Observable<SelectionValue | undefined>
      getSelection: () => SelectionValue | undefined
      /**
       * Create an ordered range from a selection.
       *
       * This means the start and end nodes will be ordered to maintain natural
       * order in the document.
       */
      createOrderedRangeFromSelection: (params: {
        selection: {
          anchorNode?: Node | null
          anchorOffset?: number
          focusNode?: Node | null
          focusOffset?: number
        }
        spineItem: SpineItem
      }) => Range | undefined
    }
  } => {
    const reader = next(options)
    const selectionSubject = new BehaviorSubject<SelectionValue | undefined>(
      undefined,
    )
    const selectionWithPointerUpSubject = new Subject<[Event, SelectionValue]>()

    reader.hookManager.register(
      `item.onDocumentLoad`,
      ({ itemId, destroy$, destroy }) => {
        const item = reader.spineItemsManager.get(itemId)

        const frame = item?.renderer.getDocumentFrame()

        const itemIndex =
          reader.spineItemsManager.getSpineItemIndex(itemId) ?? 0

        if (frame) {
          const frameDoc =
            frame.contentDocument || frame.contentWindow?.document

          if (frameDoc) {
            const selectionTracker = new SelectionTracker(frameDoc)

            merge(
              selectionTracker.selectionChange$.pipe(
                tap((selection) => {
                  if (selection?.toString()) {
                    selectionSubject.next({
                      document: frameDoc,
                      selection,
                      itemIndex,
                    })
                  } else {
                    selectionSubject.next(undefined)
                  }
                }),
              ),
              selectionTracker.selectionAfterPointerUp$.pipe(
                tap(([event, selection]) => {
                  selectionWithPointerUpSubject.next([
                    event,
                    {
                      document: frameDoc,
                      selection,
                      itemIndex,
                    },
                  ])
                }),
              ),
            )
              .pipe(takeUntil(destroy$))
              .subscribe()

            destroy(() => {
              selectionTracker.destroy()
            })
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
      share(),
    )

    const selectionAfterPointerUp$ =
      selectionWithPointerUpSubject.asObservable()

    const lastSelectionOnPointerdown$ = reader.context.containerElement$.pipe(
      switchMap((container) => fromEvent(container, "pointerdown")),
      withLatestFrom(selection$),
      map(([, selection]) => selection),
      startWith(undefined),
      shareReplay(1),
      takeUntil(reader.$.destroy$),
    )

    return {
      ...reader,
      selection: {
        selection$,
        selectionStart$,
        selectionEnd$,
        selectionAfterPointerUp$,
        lastSelectionOnPointerdown$,
        getSelection: () => selectionSubject.getValue(),
        createOrderedRangeFromSelection,
      },
      destroy: () => {
        selectionSubject.complete()

        reader.destroy()
      },
    }
  }
