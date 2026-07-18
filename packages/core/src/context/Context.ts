import type { Manifest } from "@prose-reader/shared"
import { isFullyPrePaginated } from "../manifest/isFullyPrePaginated"
import { ReactiveEntity } from "../utils/ReactiveEntity"
import { BridgeEvent } from "./BridgeEvent"

export type ContextState = {
  manifest: Manifest
  rootElement?: HTMLElement
  hasVerticalWriting?: boolean
  assumedRenditionLayout: "reflowable" | "pre-paginated"
  isFullyPrePaginated: boolean
}

export class Context extends ReactiveEntity<ContextState> {
  public bridgeEvent = new BridgeEvent()

  constructor(manifest: Manifest) {
    super({
      manifest,
      assumedRenditionLayout: manifest.renditionLayout ?? "reflowable",
      isFullyPrePaginated: isFullyPrePaginated(manifest),
    })
  }

  /**
   * The manifest is fixed for the lifetime of the reader, only the
   * runtime state (eg: rootElement, hasVerticalWriting) can change.
   */
  public update(newState: Partial<Omit<ContextState, "manifest">>) {
    this.mergeCompare(newState)
  }

  /**
   * RTL only makes sense for horizontal scrolling
   */
  public isRTL = () => {
    return this.value.manifest.readingDirection === `rtl`
  }

  get manifest() {
    return this.value.manifest
  }

  get readingDirection() {
    return this.manifest.readingDirection
  }
}
