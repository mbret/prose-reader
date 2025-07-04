import type { Manifest } from "@prose-reader/shared"
import { distinctUntilChanged, filter, map } from "rxjs/operators"
import { isFullyPrePaginated } from "../manifest/isFullyPrePaginated"
import { isDefined } from "../utils/isDefined"
import { ReactiveEntity } from "../utils/ReactiveEntity"
import { BridgeEvent } from "./BridgeEvent"

export type ContextState = {
  rootElement?: HTMLElement
  manifest?: Manifest
  hasVerticalWriting?: boolean
  assumedRenditionLayout: "reflowable" | "pre-paginated"
  isFullyPrePaginated?: boolean
}

export class Context extends ReactiveEntity<ContextState> {
  public bridgeEvent = new BridgeEvent()
  public manifest$ = this.pipe(
    map((state) => state.manifest),
    filter(isDefined),
    distinctUntilChanged(),
  )

  constructor() {
    super({
      assumedRenditionLayout: "reflowable",
    })
  }

  public update(newState: Partial<ContextState>) {
    const previousState = this.value
    const manifest = newState.manifest ?? previousState.manifest

    const newCompleteState = {
      ...previousState,
      ...newState,
      ...(newState.manifest && {
        isFullyPrePaginated: isFullyPrePaginated(manifest),
        assumedRenditionLayout: manifest?.renditionLayout ?? "reflowable",
      }),
    }

    this.mergeCompare(newCompleteState)
  }

  /**
   * RTL only makes sense for horizontal scrolling
   */
  public isRTL = () => {
    return this.value.manifest?.readingDirection === `rtl`
  }

  get manifest() {
    return this.value.manifest
  }

  get readingDirection() {
    return this.manifest?.readingDirection
  }
}
