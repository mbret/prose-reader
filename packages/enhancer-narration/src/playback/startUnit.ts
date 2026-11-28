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
 * The index of the unit a narration starts with, `undefined` when it has
 * none: no unit at all, or none at the cfi or after it.
 *
 * The units are read in order and none is assumed sorted by cfi: a source
 * gives them in the order it narrates them.
 */
export const getIndexOfStartUnit = (
  units: readonly NarrationUnit[],
  startUnit: StartUnitOfSpineItem,
): number | undefined => {
  if (units.length === 0) return undefined

  if (startUnit.type === "first") return 0

  if (startUnit.type === "firstStartingAtOrAfterCfi") {
    const index = units.findIndex(
      (unit) => compareStartOfUnitWithCfi(unit, startUnit.cfi) >= 0,
    )

    return index === -1 ? undefined : index
  }

  return Math.max(
    units.findLastIndex(
      (unit) => compareStartOfUnitWithCfi(unit, startUnit.cfi) <= 0,
    ),
    0,
  )
}
