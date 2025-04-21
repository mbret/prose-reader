import { type CfiPart, type ParsedCfi, parse } from "./parse"

/**
 * Collapses a parsed CFI to a single path (private helper for compare)
 * @param parsed The parsed CFI to collapse
 * @param toEnd Whether to collapse to the end of a range
 * @returns A collapsed CFI
 */
function collapse(parsed: ParsedCfi, toEnd = false): CfiPart[][] {
  if (typeof parsed === "string") {
    return collapse(parse(parsed), toEnd)
  }

  if ("parent" in parsed) {
    // It's a range
    if (toEnd) {
      return parsed.parent.concat(parsed.end)
    }
    return parsed.parent.concat(parsed.start)
  }

  // It's a single CFI
  return parsed
}

/**
 * Get the weight of a step type for sorting
 * According to rule 9: character offset (:) < child (/) < temporal-spatial (~ or @) < reference (!)
 */
function getStepTypeWeight(part: CfiPart): number {
  if (part.offset !== undefined) return 1 // character offset (:)
  if (part.index !== undefined) return 2 // child (/)
  if (part.temporal !== undefined || part.spatial !== undefined) return 3 // temporal-spatial (~ or @)
  return 4 // reference (!)
}

/**
 * Compare two CFIs according to the EPUB CFI specification sorting rules (section 3.2)
 * @param a The first CFI
 * @param b The second CFI
 * @returns -1 if a < b, 0 if a = b, 1 if a > b
 */
export function compare(a: ParsedCfi | string, b: ParsedCfi | string): number {
  const aParsed = typeof a === "string" ? parse(a) : a
  const bParsed = typeof b === "string" ? parse(b) : b

  if ("parent" in aParsed || "parent" in bParsed) {
    // At least one is a range
    return (
      compare(collapse(aParsed), collapse(bParsed)) ||
      compare(collapse(aParsed, true), collapse(bParsed, true))
    )
  }

  // Both are single CFIs
  for (let i = 0; i < Math.max(aParsed.length, bParsed.length); i++) {
    const p = aParsed[i] || []
    const q = bParsed[i] || []
    const maxIndex = Math.max(p.length, q.length) - 1

    for (let i = 0; i <= maxIndex; i++) {
      const x = p[i]
      const y = q[i]

      if (!x) return -1
      if (!y) return 1

      // Compare step types (rule 9)
      // character offset (:) < child (/) < temporal-spatial (~ or @) < reference (!)
      const xStepType = getStepTypeWeight(x)
      const yStepType = getStepTypeWeight(y)

      if (xStepType !== yStepType) {
        return xStepType - yStepType
      }

      // Compare element indices (rule 3 & 4)
      if (x.index > y.index) return 1
      if (x.index < y.index) return -1

      // Compare temporal positions (rule 7 & 8)
      // Temporal is more important than spatial
      const xTemporal = x.temporal !== undefined
      const yTemporal = y.temporal !== undefined

      if (xTemporal && !yTemporal) return 1
      if (!xTemporal && yTemporal) return -1

      if (xTemporal && yTemporal) {
        if ((x.temporal ?? 0) > (y.temporal ?? 0)) return 1
        if ((x.temporal ?? 0) < (y.temporal ?? 0)) return -1
      }

      // Compare spatial positions (rule 5 & 6)
      const xSpatial = x.spatial !== undefined
      const ySpatial = y.spatial !== undefined

      if (xSpatial && !ySpatial) return 1
      if (!xSpatial && ySpatial) return -1

      if (xSpatial && ySpatial) {
        // Y position is more important than X (rule 5)
        const xY = x.spatial?.[1] ?? 0
        const yY = y.spatial?.[1] ?? 0

        if (xY > yY) return 1
        if (xY < yY) return -1

        // Compare X positions if Y positions are equal
        const xX = x.spatial?.[0] ?? 0
        const yX = y.spatial?.[0] ?? 0

        if (xX > yX) return 1
        if (xX < yX) return -1
      }

      // Last part comparison including character offsets
      if (i === maxIndex) {
        if ((x.offset ?? 0) > (y.offset ?? 0)) return 1
        if ((x.offset ?? 0) < (y.offset ?? 0)) return -1
      }
    }
  }

  return 0
}
