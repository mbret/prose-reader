import {
  type CfiPart,
  type ParsedCfi,
  isIndirectionOnly,
  isParsedCfiRange,
  parse,
} from "@prose-reader/cfi"

const hasIndirectionMarker = (part: CfiPart[]) => {
  return part[0]?.index === 6 && part.length > 1
}

/**
 * Root CFI are prose specific CFI that start with /0.
 * They are used when the item is not loaded and we have no other information
 * for the CFI available but still want to generate a CFI. This is the equivalent
 * of a fake CFI.
 */
export const isRootCfi = (cfi: string) => {
  const parsed = parse(cfi)

  return isIndirectionOnly(parsed)
}

const extractIndirectionPart = (parsedCfi: ParsedCfi) => {
  return Array.isArray(parsedCfi)
    ? parsedCfi[0] && hasIndirectionMarker(parsedCfi[0])
      ? parsedCfi[0]
      : undefined
    : parsedCfi.parent[0] && hasIndirectionMarker(parsedCfi.parent[0])
      ? parsedCfi.parent[0]
      : undefined
}

export const parseCfi = (cfi: string) => {
  const parsedCfi = parse(cfi)
  const indirectionPart = extractIndirectionPart(parsedCfi)
  const itemIndexPart = (indirectionPart ?? [])[1]
  const parsedSpineItemIndex = itemIndexPart?.index ?? 2
  const spineItemIndex = parsedSpineItemIndex / 2 - 1
  const isCfiRange = isParsedCfiRange(parsedCfi)
  const offset = isCfiRange
    ? parsedCfi.end.at(-1)?.at(-1)?.offset
    : parsedCfi.at(-1)?.at(-1)?.offset

  return {
    isCfiRange,
    cleanedCfi: cfi,
    itemIndex: spineItemIndex,
    offset: offset ?? 0,
  }
}
