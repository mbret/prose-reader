import {
  distinctUntilChanged,
  filter,
  fromEvent,
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
import { createOrderedRangeFromSelection } from "./selection"
import { SpineItem } from "../.."
import { trackSpineItemSelection } from "./trackSpineItemSelection"

type SelectionChange = {
  itemIndex: number
  type: "change"
  selection: Selection
}

type SelectionOver = {
  itemIndex: number
  type: "over"
  event: Event
  selection: Selection
}

type SelectionValue = SelectionChange | SelectionOver | undefined

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
      selectionOver$: Observable<SelectionOver>
      /**
       * Usefull to know about the selection state before a pointerdown event.
       * For example if you want to prevent certain action on click if user is discarding a selection.
       * A good example is delaying the opening of a reader menu.
       */
      lastSelectionOnPointerdown$: Observable<SelectionValue>
      getSelection: () => SelectionValue
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
    let lasSelection: SelectionValue = undefined

    const trackedSelection$ = reader.spineItemsManager.items$.pipe(
      switchMap((spineItems) => {
        const instances = spineItems.map((spineItem) => {
          const itemIndex =
            reader.spineItemsManager.getSpineItemIndex(spineItem) ?? 0

          return trackSpineItemSelection(spineItem).pipe(
            map((entry) => {
              if (!entry) return undefined

              return {
                ...entry,
                itemIndex,
              }
            }),
          )
        })

        return merge(...instances)
      }),
      distinctUntilChanged(),
      tap((value) => {
        lasSelection = value
      }),
      shareReplay({ refCount: true, bufferSize: 1 }),
    )

    const selection$ = trackedSelection$.pipe(
      filter((selection) => selection?.type === "change" || !selection),
      share(),
    )

    const selectionStart$ = trackedSelection$.pipe(
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

    const selectionOver$ = trackedSelection$.pipe(
      filter((selection) => selection?.type === "over"),
      share(),
    )

    const lastSelectionOnPointerdown$ = reader.context.containerElement$.pipe(
      switchMap((container) => fromEvent(container, "pointerdown")),
      withLatestFrom(selection$),
      map(([, selection]) => selection),
      startWith(undefined),
      shareReplay(1),
    )

    selection$.pipe(takeUntil(reader.$.destroy$)).subscribe()

    return {
      ...reader,
      selection: {
        selection$,
        selectionStart$,
        selectionEnd$,
        selectionOver$,
        lastSelectionOnPointerdown$,
        getSelection: () => lasSelection,
        createOrderedRangeFromSelection,
      },
    }
  }
