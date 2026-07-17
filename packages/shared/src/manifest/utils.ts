import type { Manifest } from "./Manifest"

export type SpreadPosition = "left" | "right" | "none"

export const getItemSpreadPosition = (
  item: Manifest[`spineItems`][number],
): Exclude<SpreadPosition, "none"> | undefined => {
  const hasPageSpreadLeft = item.pageSpreadLeft === true
  const hasPageSpreadRight = item.pageSpreadRight === true

  if (hasPageSpreadLeft === hasPageSpreadRight) return undefined

  return hasPageSpreadLeft ? `left` : `right`
}
