import { describe, expect, it } from "vitest"
import {
  createTestManifest,
  createTestManifestSpineItems,
} from "../tests/utils"
import { getPageStartProgression, getSpineItemProgression } from "./progression"

const createManifestWithWeights = (weights: (number | undefined)[]) =>
  createTestManifest({
    spineItems: createTestManifestSpineItems(
      weights.map((progressionWeight) => ({ progressionWeight })),
    ),
  })

/** Where every page of a book of `pagesPerItem` pages per item starts. */
const getEveryPageStartProgression = (
  weights: (number | undefined)[],
  pagesPerItem: number,
) => {
  const manifest = createManifestWithWeights(weights)

  return manifest.spineItems.flatMap((_, spineItemIndex) =>
    Array.from({ length: pagesPerItem }, (_, pageIndex) =>
      getPageStartProgression({
        manifest,
        spineItemIndex,
        pageIndex,
        numberOfPages: pagesPerItem,
      }),
    ),
  )
}

describe("spine item progression", () => {
  it("is where the weights of the items before it end, and its own weight", () => {
    const manifest = createManifestWithWeights([0.2, 0.3, 0.5])

    expect(getSpineItemProgression(manifest, 2)).toEqual({
      start: 0.5,
      weight: 0.5,
    })
  })

  it.each([
    ["some items have no weight", [1, undefined, 0.5]],
    ["the weights add up to more than the book", [1, 1, 1]],
    ["the weights add up to nothing", [0, 0, 0]],
  ])("keeps every page within the book when %s", (_, weights) => {
    const progressions = getEveryPageStartProgression(weights, 4)

    for (const progression of progressions) {
      expect(progression).toBeGreaterThanOrEqual(0)
      expect(progression).toBeLessThan(1)
    }
    // Pages start further into the book in reading order.
    expect(progressions).toEqual([...progressions].sort((a, b) => a - b))
  })

  it("gives every item an even share when one has no weight", () => {
    const manifest = createManifestWithWeights([0.9, undefined])

    expect(getSpineItemProgression(manifest, 1)).toEqual({
      start: 0.5,
      weight: 0.5,
    })
  })

  it("scales weights that do not add up to the whole book", () => {
    const manifest = createManifestWithWeights([1, 3])

    expect(getSpineItemProgression(manifest, 1)).toEqual({
      start: 0.25,
      weight: 0.75,
    })
  })
})
