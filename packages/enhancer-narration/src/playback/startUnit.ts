import { collapse, compare } from "@prose-reader/cfi"
import type { NarrationUnit } from "../types.ts"

/**
 * Whether the unit ends after the point: the point is in the unit, or before
 * it. A unit whose cfi is not a range has no length, so it ends after a point
 * that it is at.
 */
const isUnitEndingAfterPoint = (unit: NarrationUnit, pointCfi: string) => {
  // A source can work out the cfi of a unit each time it is read.
  const unitCfi = unit.cfi

  return (
    compare(collapse(unitCfi, { to: "end" }), pointCfi) > 0 ||
    compare(collapse(unitCfi), pointCfi) >= 0
  )
}

/**
 * The index of the unit a narration starts with: the first unit that ends
 * after `startCfi`, or the first unit when there is no `startCfi`. That is
 * the unit `startCfi` is in, or the next one when it is between two units.
 *
 * `undefined` when the narration has no such unit: it has no unit at all, or
 * they all end at `startCfi` or before it.
 *
 * The units are in the order of their cfis, so the search is a binary one. A
 * source can work out the cfi of a unit only when it is read, and a spine
 * item can have tens of thousands of units: the search reads a few of them,
 * where a scan would read them all.
 */
export const getIndexOfStartUnit = (
  units: readonly NarrationUnit[],
  startCfi: string | undefined,
): number | undefined => {
  if (startCfi === undefined) return units.length > 0 ? 0 : undefined

  // A range starts the narration where the range starts.
  const startPointCfi = collapse(startCfi)
  let lowestCandidateIndex = 0
  let indexAfterCandidates = units.length

  while (lowestCandidateIndex < indexAfterCandidates) {
    const middleIndex = Math.floor(
      (lowestCandidateIndex + indexAfterCandidates) / 2,
    )
    const middleUnit = units[middleIndex]

    if (middleUnit && isUnitEndingAfterPoint(middleUnit, startPointCfi)) {
      indexAfterCandidates = middleIndex
    } else {
      lowestCandidateIndex = middleIndex + 1
    }
  }

  return lowestCandidateIndex === units.length
    ? undefined
    : lowestCandidateIndex
}
