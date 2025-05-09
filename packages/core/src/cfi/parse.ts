import {
  type CfiPart,
  type ParsedCfi,
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

  const checkIndirectionFromParsedCfiArray = (parsed: CfiPart[][]) => {
    // we dont just have indirection, likely it contains a node
    if (parsed.length !== 1) return false

    // we only care about last indirection
    const indirectionPart = parsed[0] ?? []

    return hasIndirectionMarker(indirectionPart)
  }

  if (Array.isArray(parsed)) {
    return checkIndirectionFromParsedCfiArray(parsed)
  }

  return checkIndirectionFromParsedCfiArray(parsed.parent)
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

export const parseCfi = (
  cfi: string,
): {
  cleanedCfi: string
  itemIndex?: number
  offset?: number
} => {
  const parsedCfi = parse(cfi)
  const indirectionPart = extractIndirectionPart(parsedCfi)
  const itemIndexPart = (indirectionPart ?? [])[1]
  const parsedSpineItemIndex = itemIndexPart?.index ?? 2
  const spineItemIndex = parsedSpineItemIndex / 2 - 1
  const offset = isParsedCfiRange(parsedCfi)
    ? parsedCfi.end.at(-1)?.at(-1)?.offset
    : parsedCfi.at(-1)?.at(-1)?.offset

  return {
    cleanedCfi: cfi,
    itemIndex: spineItemIndex,
    offset: offset ?? 0,
  }
}
