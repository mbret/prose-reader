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
      selection$: Observable<SelectionValue>
      selectionStart$: Observable<boolean>
      selectionEnd$: Observable<void>
      selectionOver$: Observable<SelectionOver>
      lastSelectionOnPointerdown$: Observable<SelectionValue>
      getSelection: () => SelectionValue
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
      startWith(undefined),
      distinctUntilChanged(),
      tap((value) => {
        lasSelection = value
      }),
      shareReplay({ refCount: true, bufferSize: 1 }),
    )

    const selection$ = trackedSelection$

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
      shareReplay({ refCount: true, bufferSize: 1 }),
    )

    merge(selection$, lastSelectionOnPointerdown$)
      .pipe(takeUntil(reader.$.destroy$))
      .subscribe()

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
