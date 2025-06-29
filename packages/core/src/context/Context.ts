import type { Manifest } from "@prose-reader/shared"
import { Subject, merge, of } from "rxjs"
import {
  distinctUntilChanged,
  filter,
  map,
  shareReplay,
  switchMap,
  tap,
} from "rxjs/operators"
import { isFullyPrePaginated } from "../manifest/isFullyPrePaginated"
import { ReactiveEntity } from "../utils/ReactiveEntity"
import { isDefined } from "../utils/isDefined"
import { isShallowEqual } from "../utils/objects"
import { observeIntersection, observeResize } from "../utils/rxjs"
import { BridgeEvent } from "./BridgeEvent"
import { isUsingSpreadMode } from "./isUsingSpreadMode"

export type ContextState = {
  rootElement?: HTMLElement
  manifest?: Manifest
  hasVerticalWriting?: boolean
  isUsingSpreadMode?: boolean
  assumedRenditionLayout: "reflowable" | "pre-paginated"
  isFullyPrePaginated?: boolean
  forceSinglePageMode?: boolean
  calculatedInnerMargin: number
  marginTop: number
  marginBottom: number
  /**
   * @deprecated
   */
  visibleAreaRect: {
    width: number
    height: number
    x: number
    y: number
  }
}

export class Context extends ReactiveEntity<ContextState> {
  public bridgeEvent = new BridgeEvent()

  public destroy$ = new Subject<void>()

  public state$ = this.pipe(distinctUntilChanged(isShallowEqual))

  public manifest$ = this.pipe(
    map((state) => state.manifest),
    filter(isDefined),
    distinctUntilChanged(),
  )

  /**
   * Optimized size observer. Use it when you need information regarding layout without causing
   * re-flow.
   * @example: Calculating coordinates on click events.
   * @important Do not use it to affect the reader layout as it's async. Use layout information instead.
   */
  public containerElementRect$ = this.watch(`rootElement`).pipe(
    switchMap((element) => {
      if (!element) return of(undefined)

      return merge(
        observeResize(element).pipe(map((entries) => entries[0]?.contentRect)),
        observeIntersection(element).pipe(
          map((entries) => entries[0]?.boundingClientRect),
        ),
      )
    }),
    tap((entries) => console.log(entries)),
    distinctUntilChanged(isShallowEqual),
    shareReplay({ refCount: true, bufferSize: 1 }),
  )

  public hasVerticalWriting$ = this.pipe(
    map((state) => state.hasVerticalWriting),
    filter(isDefined),
    distinctUntilChanged(),
  )

  public isUsingSpreadMode$ = this.pipe(
    map((state) => state.isUsingSpreadMode),
    distinctUntilChanged(),
  )

  constructor() {
    super({
      marginBottom: 0,
      marginTop: 0,
      calculatedInnerMargin: 0,
      assumedRenditionLayout: "reflowable",
      visibleAreaRect: {
        width: 0,
        height: 0,
        x: 0,
        y: 0,
      },
    })
  }

  /**
   * @todo optimize to not run if not necessary
   */
  public update(newState: Partial<ContextState>) {
    // visibleAreaRect.width = width - horizontalMargin * 2

    const previousState = this.value
    const manifest = newState.manifest ?? previousState.manifest
    const forceSinglePageMode =
      newState.forceSinglePageMode ?? previousState.forceSinglePageMode
    const visibleAreaRect =
      newState.visibleAreaRect ?? previousState.visibleAreaRect
    const marginTop = newState.marginTop ?? previousState.marginTop
    const marginBottom = newState.marginBottom ?? previousState.marginBottom

    // if (this.useChromiumRubyBugSafeInnerMargin) {
    //   this.visibleAreaRect.height =
    //     this.visibleAreaRect.height - this.getCalculatedInnerMargin()
    // }

    const newCompleteState = {
      ...previousState,
      ...newState,
      ...(newState.visibleAreaRect && {
        ...newState.visibleAreaRect,
        height: newState.visibleAreaRect.height - marginTop - marginBottom,
      }),
      ...(newState.manifest && {
        isFullyPrePaginated: isFullyPrePaginated(manifest),
        assumedRenditionLayout: manifest?.renditionLayout ?? "reflowable",
      }),
      isUsingSpreadMode: isUsingSpreadMode({
        manifest,
        visibleAreaRect,
        forceSinglePageMode,
      }),
    }

    if (!isShallowEqual(newCompleteState, previousState)) {
      this.next(newCompleteState)
    }
  }

  /**
   * RTL only makes sense for horizontal scrolling
   */
  public isRTL = () => {
    return this.value.manifest?.readingDirection === `rtl`
  }

  /**
   * @deprecated
   */
  get state() {
    return this.value
  }

  get manifest() {
    return this.value.manifest
  }

  get readingDirection() {
    return this.manifest?.readingDirection
  }

  /**
   * @deprecated
   */
  public getPageSize() {
    const { isUsingSpreadMode, visibleAreaRect } = this.value

    return {
      width: isUsingSpreadMode
        ? visibleAreaRect.width / 2
        : visibleAreaRect.width,
      height: visibleAreaRect.height,
    }
  }
}
