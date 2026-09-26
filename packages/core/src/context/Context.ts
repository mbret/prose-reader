import type { Manifest } from "@prose-reader/shared"
import { isFullyPrePaginated } from "../manifest/isFullyPrePaginated"
import { isSpreadAllowedByBook } from "../manifest/isSpreadAllowedByBook"
import { ReactiveEntity } from "../utils/ReactiveEntity"
import { BridgeEvent } from "./BridgeEvent"

export type ContextState = {
  manifest: Manifest
  rootElement?: HTMLElement
  hasVerticalWriting?: boolean
  assumedRenditionLayout: "reflowable" | "pre-paginated"
  isFullyPrePaginated: boolean
  /**
   * Whether the book can be shown in a spread at all. It cannot when its
   * `rendition:spread` is `none` or its `rendition:flow` is
   * `scrolled-continuous`, and the `spreadMode` setting then changes nothing.
   * Whether a spread is shown is the viewport's `isSpread`.
   */
  isSpreadAllowed: boolean
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
      isSpreadAllowed: isSpreadAllowedByBook(manifest),
    })

    this.document = ownerDocument
  }

  /**
   * Only the runtime state changes. The manifest is fixed for the lifetime of
   * the reader, and so is everything derived from it in the constructor
   * (`assumedRenditionLayout`, `isFullyPrePaginated`, `isSpreadAllowed`),
   * which has no other writer.
   */
  public update(
    newState: Partial<Pick<ContextState, "rootElement" | "hasVerticalWriting">>,
  ) {
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
