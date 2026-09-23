import type { PositionFormat } from "@prose-reader/shared/positions"
import { generateXPointer } from "./generate"
import { parseXPointer } from "./parse"
import { resolveXPointer } from "./resolve"

export const koreaderPositionFormat: PositionFormat = {
  name: "koreader",
  spineItemIndexOf: (value) => parseXPointer(value)?.spineItemIndex,
  resolve: (value, { document }) => resolveXPointer(value, document),
  generate: (position, { spineItem }) =>
    generateXPointer(position, spineItem.index),
}
