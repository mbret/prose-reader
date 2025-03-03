import type { Manifest } from "@prose-reader/shared"
import { Subject } from "rxjs"
import { distinctUntilChanged, filter, map } from "rxjs/operators"
import { isFullyPrePaginated } from "../manifest/isFullyPrePaginated"
import { ReactiveEntity } from "../utils/ReactiveEntity"
import { isDefined } from "../utils/isDefined"
import { isShallowEqual } from "../utils/objects"
import { BridgeEvent } from "./BridgeEvent"
import { isUsingSpreadMode } from "./isUsingSpreadMode"

export type ContextState = {
  containerElement?: HTMLElement
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

  public containerElement$ = this.pipe(
    map((state) => state.containerElement),
    filter(isDefined),
    distinctUntilChanged(),
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

    const previousState = this.getValue()
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
    return this.getValue().manifest?.readingDirection === `rtl`
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
    const { isUsingSpreadMode, visibleAreaRect } = this.getValue()

    return {
      width: isUsingSpreadMode
        ? visibleAreaRect.width / 2
        : visibleAreaRect.width,
      height: visibleAreaRect.height,
    }
  }
}
