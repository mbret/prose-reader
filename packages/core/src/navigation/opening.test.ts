// @vitest-environment jsdom
import { skip } from "rxjs"
import { describe, expect, it, vi } from "vitest"
import { SpinePosition } from "../spine/types"
import {
  createTestReader,
  installReaderTestEnvironment,
  mountTestReader,
  renderTextDocuments,
  settledOn,
} from "../tests/readerHarness"
import type { ReadingPosition } from "./types"

installReaderTestEnvironment()

/**
 * The reading positions of a navigation whose page is not laid out yet: the
 * same value, not final, then final once the page is.
 */
const notFinalThenFinal = ({
  cfi,
  percentageEstimateOfBook,
}: Omit<ReadingPosition, "isFinal">): ReadingPosition[] => [
  { cfi, percentageEstimateOfBook, isFinal: false },
  { cfi, percentageEstimateOfBook, isFinal: true },
]

/** Resolves once the reading position is final. */
const readingPositionIsFinal = (positions: ReadingPosition[]) =>
  vi.waitFor(() => expect(positions.at(-1)?.isFinal).toBe(true))

/**
 * The reading positions of opening at a cfi naming a place in the second of
 * two items, each half the book: the item's start while it loads, not final,
 * then the cfi once its document shows it, never the start of the book.
 * Whether the cfi is final needs its node measured, which only a browser can
 * do: the browser specs check it.
 */
const expectSecondItemStartThenCfi = async (
  reader: ReturnType<typeof createTestReader>,
  positions: ReadingPosition[],
  cfi: string,
) => {
  await vi.waitFor(() => expect(positions.at(-1)?.cfi).toBe(cfi))

  const item = reader.spineItemsManager.get(1)

  if (!item) throw new Error("item 1 is missing")

  expect(positions).toHaveLength(2)
  expect(positions[0]).toEqual({
    cfi: reader.cfi.generateRootCfi(item.item),
    percentageEstimateOfBook: 0.5,
    isFinal: false,
  })
  expect(positions[1]).toMatchObject({ cfi, percentageEstimateOfBook: 0.5 })
}

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
    const reader = createTestReader({
      target: { type: "cfi", value: cfi },
      // Items with a document, where the cfi is found.
      getRenderer: renderTextDocuments,
    })

    const positions: ReadingPosition[] = []
    reader.navigation.readingPosition$.subscribe((position) => {
      positions.push(position)
    })

    mountTestReader(reader)
    await settledOn(reader, 1)
    await expectSecondItemStartThenCfi(reader, positions, cfi)
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
      await readingPositionIsFinal(positions)

      /**
       * A saved position gone stale or corrupted names nothing in the book.
       * The reading position is where the reader opened instead, never that
       * value.
       */
      expect(settled.begin.spineItemIndex).toBe(0)
      expect(positions).toEqual(
        notFinalThenFinal({
          cfi: settled.begin.cfi,
          percentageEstimateOfBook: 0,
        }),
      )

      reader.navigation.goToSpineItem({ indexOrId: 1, animation: false })

      expect((await settledOn(reader, 1)).begin.spineItemIndex).toBe(1)
    },
  )

  /**
   * The reader opens once its items are first laid out. A navigation asked for
   * before then takes it somewhere else, so it opens there instead.
   */
  it("is where a navigation asked for before it opens goes", async () => {
    const reader = createTestReader()

    const positions: ReadingPosition[] = []
    reader.navigation.readingPosition$.subscribe((position) => {
      positions.push(position)
    })

    reader.navigation.goToSpineItem({ indexOrId: 1, animation: false })
    mountTestReader(reader)

    const settled = await settledOn(reader)
    await readingPositionIsFinal(positions)

    expect(settled.begin.spineItemIndex).toBe(1)
    // The second of two items, each half the book.
    expect(positions).toEqual(
      notFinalThenFinal({
        cfi: settled.begin.cfi,
        percentageEstimateOfBook: 0.5,
      }),
    )
  })

  /**
   * A navigation naming nothing in the book takes the reader nowhere. Ignored,
   * it does not replace where the reader opens either.
   */
  it("is its target when a navigation asked for before it opens names nothing in the book", async () => {
    const cfi = "epubcfi(/6/4[1]!/4/2)"
    const reader = createTestReader({
      target: { type: "cfi", value: cfi },
      getRenderer: renderTextDocuments,
    })

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

    reader.navigation.navigate({
      target: { type: "cfi", value: "not a cfi" },
      animation: false,
    })
    mountTestReader(reader)

    // As if none was asked for, the reader opens with a navigation of its own.
    await vi.waitFor(() => expect(navigations[0]).toBe("user"))

    const settled = await settledOn(reader)

    expect(settled.begin.spineItemIndex).toBe(1)
    await expectSecondItemStartThenCfi(reader, positions, cfi)
  })

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
      getRenderer: renderTextDocuments,
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

    /**
     * The cfi as given, which names the place in the book the enhancer maps
     * onto the second item.
     */
    await expectSecondItemStartThenCfi(reader, positions, cfi)
  })
})
