import { collapse, compare } from "@prose-reader/cfi"
import type { NarrationUnit } from "../types.ts"

/**
 * The unit the narration of a spine item starts with, said before the units
 * of that spine item are known.
 */
export type StartUnitOfSpineItem =
  | { type: "first" }
  /**
   * The first unit that starts at the cfi or after it: a unit that the cfi
   * falls in started before it, and is not the one.
   */
  | { type: "firstStartingAtOrAfterCfi"; cfi: string }
  /**
   * The unit the cfi falls in. Between two units, it is the one before. Before
   * the first unit, it is the first.
   */
  | { type: "holdingCfi"; cfi: string }

/**
 * Negative when the unit starts before the cfi, zero when it starts at it,
 * positive when it starts after.
 */
const compareStartOfUnitWithCfi = (unit: NarrationUnit, cfi: string) =>
  compare(collapse(unit.cfi), collapse(cfi))

/**
 * The index of the first unit that `isAfterBoundary` holds for, or the number
 * of units when it holds for none. It holds for every unit after the first
 * one it holds for, as the units are in the order of their cfis.
 *
 * A source can work out the cfi of a unit only when it is read, and a spine
 * item can have tens of thousands of units: the search reads a few of them,
 * where a scan would read them all.
 */
const getIndexOfFirstUnitAfterBoundary = (
  units: readonly NarrationUnit[],
  isAfterBoundary: (unit: NarrationUnit) => boolean,
) => {
  let lowestCandidateIndex = 0
  let indexAfterCandidates = units.length

  while (lowestCandidateIndex < indexAfterCandidates) {
    const middleIndex = Math.floor(
      (lowestCandidateIndex + indexAfterCandidates) / 2,
    )
    const middleUnit = units[middleIndex]

    if (middleUnit && isAfterBoundary(middleUnit)) {
      indexAfterCandidates = middleIndex
    } else {
      lowestCandidateIndex = middleIndex + 1
    }
  }

  return lowestCandidateIndex
}

/**
 * The index of the unit a narration starts with, `undefined` when it has
 * none: no unit at all, or none at the cfi or after it.
 */
export const getIndexOfStartUnit = (
  units: readonly NarrationUnit[],
  startUnit: StartUnitOfSpineItem,
): number | undefined => {
  if (units.length === 0) return undefined

  if (startUnit.type === "first") return 0

  if (startUnit.type === "firstStartingAtOrAfterCfi") {
    const index = getIndexOfFirstUnitAfterBoundary(
      units,
      (unit) => compareStartOfUnitWithCfi(unit, startUnit.cfi) >= 0,
    )

    return index === units.length ? undefined : index
  }

  // The unit before the first one that starts after the cfi.
  return Math.max(
    getIndexOfFirstUnitAfterBoundary(
      units,
      (unit) => compareStartOfUnitWithCfi(unit, startUnit.cfi) > 0,
    ) - 1,
    0,
  )
}
