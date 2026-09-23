import type { Manifest } from "./manifest"

/** A DOM boundary point; text offsets are UTF-16 offsets. */
export type DomPosition = { node: Node; offset?: number }

export type PositionTarget = { format: string; value: string }

export type PositionFormatContext = {
  spineItem: Manifest["spineItems"][number]
  document: Document
}

/** Synchronous, pure adapters over a loaded spine item document. */
export type PositionFormat = {
  name: string
  spineItemIndexOf(value: string): number | undefined
  /** An unresolved value falls back to the named item's start. */
  resolve(
    value: string,
    context: PositionFormatContext,
  ): DomPosition | undefined
  /** Undefined omits this format from the page's positions. */
  generate(
    position: DomPosition,
    context: PositionFormatContext,
  ): string | undefined
}
