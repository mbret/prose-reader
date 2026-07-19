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

  /**
   * The document the reader creates all of its DOM in. This is the single
   * source of truth for DOM creation so the reader can be rendered inside a
   * foreign document (eg: an iframe's `contentDocument`). Defaults to the
   * ambient document; the container passed to `mount` must belong to it.
   */
  public readonly document: Document

  constructor(
    manifest: Manifest,
    ownerDocument: Document = globalThis.document,
  ) {
    super({
      manifest,
      assumedRenditionLayout: manifest.renditionLayout ?? "reflowable",
      isFullyPrePaginated: isFullyPrePaginated(manifest),
    })

    this.document = ownerDocument
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
