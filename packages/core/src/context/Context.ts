/* eslint-disable @typescript-eslint/ban-types */
import { BehaviorSubject, Subject } from "rxjs"
import { distinctUntilChanged, map, filter } from "rxjs/operators"
import { Manifest } from "@prose-reader/shared"
import { isDefined } from "../utils/isDefined"
import { isUsingSpreadMode } from "./isUsingSpreadMode"
import { isShallowEqual } from "../utils/objects"
import { isFullyPrePaginated } from "../manifest/isFullyPrePaginated"
import { BridgeEvent } from "./BridgeEvent"

export type ContextState = {
  containerElement?: HTMLElement
  manifest?: Manifest
  hasVerticalWriting?: boolean
  isUsingSpreadMode?: boolean
  isFullyPrePaginated?: boolean
  forceSinglePageMode?: boolean
  calculatedInnerMargin: number
  marginTop: number
  marginBottom: number
  visibleAreaRect: {
    width: number
    height: number
    x: number
    y: number
  }
}

export class Context {
  // @see https://github.com/microsoft/TypeScript/issues/17293
  _stateSubject = new BehaviorSubject<ContextState>({
    marginBottom: 0,
    marginTop: 0,
    calculatedInnerMargin: 0,
    visibleAreaRect: {
      width: 0,
      height: 0,
      x: 0,
      y: 0,
    },
  })

  public bridgeEvent = new BridgeEvent()

  public destroy$ = new Subject<void>()

  public state$ = this._stateSubject.pipe(distinctUntilChanged(isShallowEqual))

  public manifest$ = this._stateSubject.pipe(
    map((state) => state.manifest),
    filter(isDefined),
    distinctUntilChanged(),
  )

  public containerElement$ = this._stateSubject.pipe(
    map((state) => state.containerElement),
    filter(isDefined),
    distinctUntilChanged(),
  )

  public hasVerticalWriting$ = this._stateSubject.pipe(
    map((state) => state.hasVerticalWriting),
    filter(isDefined),
    distinctUntilChanged(),
  )

  public isUsingSpreadMode$ = this._stateSubject.pipe(
    map((state) => state.isUsingSpreadMode),
    distinctUntilChanged(),
  )

  /**
   * @todo optimize to not run if not necessary
   */
  public update(newState: Partial<ContextState>) {
    // visibleAreaRect.width = width - horizontalMargin * 2

    const previousState = this._stateSubject.getValue()
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
      }),
      isUsingSpreadMode: isUsingSpreadMode({
        manifest,
        visibleAreaRect,
        forceSinglePageMode,
      }),
    }

    if (!isShallowEqual(newCompleteState, previousState)) {
      this._stateSubject.next(newCompleteState)
    }
  }

  /**
   * RTL only makes sense for horizontal scrolling
   */
  public isRTL = () => {
    return this._stateSubject.getValue().manifest?.readingDirection === `rtl`
  }

  get state() {
    return this._stateSubject.getValue()
  }

  get manifest() {
    return this.state.manifest
  }

  get readingDirection() {
    return this.manifest?.readingDirection
  }

  public getPageSize() {
    const { isUsingSpreadMode, visibleAreaRect } = this._stateSubject.getValue()

    return {
      width: isUsingSpreadMode
        ? visibleAreaRect.width / 2
        : visibleAreaRect.width,
      height: visibleAreaRect.height,
    }
  }

  public destroy = () => {
    this._stateSubject.complete()
    this.destroy$.next()
    this.destroy$.complete()
  }
}
