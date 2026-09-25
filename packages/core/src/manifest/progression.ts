import type { Manifest } from "@prose-reader/shared"

/**
 * How much of the book a spine item holds, from 0 to 1: its
 * `progressionWeight`, or an even share of the spine when it has none.
 */
const getSpineItemProgressionWeight = (
  manifest: Manifest,
  item: Manifest["spineItems"][number] | undefined,
) => item?.progressionWeight ?? 1 / manifest.spineItems.length

/**
 * Where the spine item at `index` starts in the book and how much of it it
 * holds, both from 0 to 1.
 */
export const getSpineItemProgression = (manifest: Manifest, index: number) => ({
  start: manifest.spineItems
    .slice(0, index)
    .reduce(
      (total, item) => total + getSpineItemProgressionWeight(manifest, item),
      0,
    ),
  weight: getSpineItemProgressionWeight(manifest, manifest.spineItems[index]),
})

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
