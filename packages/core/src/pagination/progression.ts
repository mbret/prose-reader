import type { Manifest } from "@prose-reader/shared"
import { isDefined } from "../utils/isDefined"

/**
 * How much of the book each spine item holds, from 0 to 1 and adding up to 1.
 * The manifest's `progressionWeight`s, scaled to their total, when every item
 * has one and they add up to more than nothing. Otherwise every item holds an
 * even share: weights for part of the spine say nothing of the rest.
 */
const getSpineItemsProgressionWeights = (manifest: Manifest) => {
  const weights = manifest.spineItems.map(
    ({ progressionWeight }) => progressionWeight,
  )
  const totalWeight = weights.reduce<number>(
    (total, weight) => total + (weight ?? 0),
    0,
  )

  if (totalWeight > 0 && weights.every(isDefined)) {
    return weights.map((weight) => weight / totalWeight)
  }

  return weights.map(() => 1 / weights.length)
}

/**
 * Where the spine item at `index` starts in the book and how much of it it
 * holds, both from 0 to 1.
 */
export const getSpineItemProgression = (manifest: Manifest, index: number) => {
  const weights = getSpineItemsProgressionWeights(manifest)

  return {
    start: weights.slice(0, index).reduce((total, weight) => total + weight, 0),
    weight: weights[index] ?? 0,
  }
}

/**
 * How far into the book a page of a spine item starts, from 0 to 1: the item's
 * start, and the share of its weight the pages before this one hold.
 */
export const getPageStartProgression = ({
  manifest,
  spineItemIndex,
  pageIndex,
  numberOfPages,
}: {
  manifest: Manifest
  spineItemIndex: number
  pageIndex: number
  numberOfPages: number
}) => {
  const { start, weight } = getSpineItemProgression(manifest, spineItemIndex)

  return numberOfPages > 0
    ? start + (weight * pageIndex) / numberOfPages
    : start
}
