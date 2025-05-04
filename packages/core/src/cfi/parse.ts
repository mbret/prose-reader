import { isParsedCfiRange, parse, resolveExtensions } from "@prose-reader/cfi"

/**
 * Root CFI are prose specific CFI that start with /0.
 * They are used when the item is not loaded and we have no other information
 * for the CFI available but still want to generate a CFI. This is the equivalent
 * of a fake CFI.
 */
export const isRootCfi = (cfi: string) => {
  const parsed = parse(cfi)

  // start with /0
  if (Array.isArray(parsed)) {
    // we only care about last indirection
    const lastCfiPart = parsed.at(-1)

    return lastCfiPart?.[0]?.index === 0
  }

  // range parent
  return parsed.parent.at(-1)?.[0]?.index === 0
}

export const parseCfi = (
  cfi: string,
): {
  cleanedCfi: string
  itemIndex?: number
  offset?: number
} => {
  const parsedCfi = parse(cfi)
  const extensions = resolveExtensions(parsedCfi)
  const proseAnchor = Number.parseInt(extensions?.["vnd.prose.anchor"] || ``)
  const offset = isParsedCfiRange(parsedCfi)
    ? parsedCfi.end.at(-1)?.at(-1)?.offset
    : parsedCfi.at(-1)?.at(-1)?.offset

  return {
    cleanedCfi: cfi,
    itemIndex: Number.isNaN(proseAnchor) ? undefined : proseAnchor,
    offset: offset ?? 0,
  }
}
