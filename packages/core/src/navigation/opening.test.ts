// @vitest-environment jsdom
import { skip } from "rxjs"
import { describe, expect, it, vi } from "vitest"
import { SpinePosition } from "../spine/types"
import {
  createTestReader,
  installReaderTestEnvironment,
  mountTestReader,
  settledOn,
} from "../tests/readerHarness"
import type { ReadingPosition } from "./types"

installReaderTestEnvironment()

describe("where the reader opens", () => {
  it("is the start of the book without a target, as a navigation of its own", async () => {
    const reader = createTestReader()

    const navigations: string[] = []
    reader.navigation.navigation$
      // The entry the navigator starts with, replayed.
      .pipe(skip(1))
      .subscribe(({ triggeredBy }) => {
        navigations.push(triggeredBy)
      })

    mountTestReader(reader)

    const settled = await settledOn(reader)

    expect(settled.begin.spineItemIndex).toBe(0)
    // Nothing is restored before the reader has gone anywhere.
    expect(navigations[0]).toBe("user")
  })

  it("is its target, without its reading position passing through the start of the book", async () => {
    const cfi = "epubcfi(/6/4[1]!/4/2)"
    const reader = createTestReader({ target: { type: "cfi", value: cfi } })

    const positions: ReadingPosition[] = []
    reader.navigation.readingPosition$.subscribe((position) => {
      positions.push(position)
    })

    mountTestReader(reader)
    await settledOn(reader, 1)

    // The second of two items, each half the book.
    expect(positions).toEqual([{ cfi, percentageEstimateOfBook: 0.5 }])
  })

  it.each([
    ["a malformed cfi", "not a cfi"],
    ["a cfi of an item the book does not have", "epubcfi(/6/999!/4/2/1:0)"],
  ])(
    "is the start of the book when its target is %s, as without a target",
    async (_, cfi) => {
      const reader = createTestReader({ target: { type: "cfi", value: cfi } })

      const navigations: string[] = []
      reader.navigation.navigation$
        // The entry the navigator starts with, replayed.
        .pipe(skip(1))
        .subscribe(({ triggeredBy }) => {
          navigations.push(triggeredBy)
        })
      const positions: ReadingPosition[] = []
      reader.navigation.readingPosition$.subscribe((position) => {
        positions.push(position)
      })

      mountTestReader(reader)

      // As without a target, the reader opens with a navigation of its own.
      await vi.waitFor(() => expect(navigations[0]).toBe("user"))

      const settled = await settledOn(reader)

      /**
       * A saved position gone stale or corrupted names nothing in the book.
       * The reading position is where the reader opened instead, never that
       * value.
       */
      expect(settled.begin.spineItemIndex).toBe(0)
      expect(positions).toEqual([
        { cfi: settled.begin.cfi, percentageEstimateOfBook: 0 },
      ])

      reader.navigation.goToSpineItem({ indexOrId: 1, animation: false })

      expect((await settledOn(reader, 1)).begin.spineItemIndex).toBe(1)
    },
  )

  it("is the place a position target names in the laid out book", async () => {
    // Items are one viewport wide: the second starts where the first ends.
    const reader = createTestReader({
      target: { type: "position", value: new SpinePosition({ x: 100, y: 0 }) },
    })

    mountTestReader(reader)

    const settled = await settledOn(reader)

    expect(settled.begin.spineItemIndex).toBe(1)
  })

  /**
   * An enhancer registers its hooks once the reader it enhances is created,
   * such as the cbz enhancer, which maps a cfi of the book onto the items it
   * splits it into.
   */
  it("is its target as the enhancers resolve it", async () => {
    const cfi = "epubcfi(/6/2[0]!/4/2)"
    const reader = createTestReader({
      target: { type: "cfi", value: cfi },
      numberOfAdjacentSpineItemToPreLoad: 0,
    })

    reader.hookManager.register("cfi.beforeResolve", ({ cfi }) =>
      cfi.replace("/6/2[0]!", "/6/4[1]!"),
    )

    const positions: ReadingPosition[] = []
    reader.navigation.readingPosition$.subscribe((position) => {
      positions.push(position)
    })

    mountTestReader(reader)

    await vi.waitFor(() =>
      expect(reader.navigation.getNavigation().spineItem).toBe(1),
    )

    const settled = await settledOn(reader)

    expect(settled.begin.spineItemIndex).toBe(1)
    expect(positions).toEqual([{ cfi, percentageEstimateOfBook: 0.5 }])
  })
})
