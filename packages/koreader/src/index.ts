export {
  cfiToXPointer,
  toCfiPosition,
  type XPointerSpineItem,
  type XPointerSpineItemLookup,
  xPointerToCfi,
} from "./cfi.ts"
export { CRENGINE_TEXT_SPLIT_SIZE } from "./crengine/text.ts"
export { getKoreaderFileDigest, getKoreaderFileNameDigest } from "./digest.ts"
export { generateXPointer } from "./generate.ts"
export { parseXPointer, XPOINTER_BOXING_ELEMENT_NAMES } from "./parse.ts"
export {
  getKoreaderProgressKind,
  type KoreaderProgressKind,
} from "./progress.ts"
export { resolveXPointer } from "./resolve.ts"
export { serializeXPointer } from "./serialize.ts"
export type { DomPosition, ParsedXPointer, XPointerStep } from "./types.ts"
