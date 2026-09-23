export {
  cfiToXPointer,
  type XPointerSpineItem,
  type XPointerSpineItemLookup,
  xPointerToCfi,
} from "./cfi"
export { CRENGINE_TEXT_SPLIT_SIZE } from "./crengine/text"
export { generateXPointer } from "./generate"
export { parseXPointer, XPOINTER_BOXING_ELEMENT_NAMES } from "./parse"
export { resolveXPointer } from "./resolve"
export { serializeXPointer } from "./serialize"
export type { DomPosition, ParsedXPointer, XPointerStep } from "./types"
