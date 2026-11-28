import { type CfiPart, type ParsedCfi, parse } from "./parse.ts"
import { isParsedCfiRange } from "./utils.ts"

/**
 * `parse` gives a boundary of a range that is only an offset (`,:5`) as a
 * copy of the last parent path that carries the offset. A boundary with steps
 * of its own (`,/1:5`) is a path under the parent, and none can repeat the
 * parent's own steps down to an offset: an offset is in a text node, which
 * has no child.
 */
const isOffsetOfParentPath = (
  boundaryPath: CfiPart[],
  lastParentPath: CfiPart[],
) =>
  boundaryPath.length === lastParentPath.length &&
  boundaryPath.at(-1)?.offset !== undefined &&
  boundaryPath.every(
    (part, index) => part.index === lastParentPath[index]?.index,
  )

/**
 * Gives the one point a CFI collapses to: the start of a range, or its end
 * with `toEnd`. A CFI that is not a range is a point already.
 */
export function collapse(cfi: ParsedCfi | string, toEnd = false): CfiPart[][] {
  const parsed = typeof cfi === "string" ? parse(cfi) : cfi

  if (!isParsedCfiRange(parsed)) return parsed

  const boundaryPath = (toEnd ? parsed.end : parsed.start)[0] ?? []
  const lastParentPath = parsed.parent.at(-1) ?? []

  // The boundary continues the last path of the parent: the two are in the
  // same document. Kept as a path of its own, it would read as a step into
  // another document.
  return [
    ...parsed.parent.slice(0, -1),
    isOffsetOfParentPath(boundaryPath, lastParentPath)
      ? boundaryPath
      : [...lastParentPath, ...boundaryPath],
  ]
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

      // Compare element indices (rule 3 & 4)
      // The step index locates the node in the document, so it always wins.
      if (x.index > y.index) return 1
      if (x.index < y.index) return -1

      // Compare step types (rule 9), only as a tie-breaker between steps at
      // the same index (eg: an offset terminating at a node vs a child step
      // descending into it)
      // character offset (:) < child (/) < temporal-spatial (~ or @) < reference (!)
      const xStepType = getStepTypeWeight(x)
      const yStepType = getStepTypeWeight(y)

      if (xStepType !== yStepType) {
        return xStepType - yStepType
      }

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
