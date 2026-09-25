// @vitest-environment jsdom
import { skip } from "rxjs"
import { describe, expect, it, vi } from "vitest"
import {
  createTestReader,
  installReaderTestEnvironment,
  mountTestReader,
  settledOn,
} from "../tests/readerHarness"

installReaderTestEnvironment()

describe("where the reader opens", () => {
  it("is the start of the book without a cfi, as a navigation of its own", async () => {
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

  it("is its cfi, without its reading position passing through the start of the book", async () => {
    const cfi = "epubcfi(/6/4[1]!/4/2)"
    const reader = createTestReader({ cfi })

    const positions: string[] = []
    reader.navigation.readingPosition$.subscribe((position) => {
      positions.push(position)
    })

    mountTestReader(reader)
    await settledOn(reader, 1)

    expect(positions).toEqual([cfi])
  })

  /**
   * An enhancer registers its hooks once the reader it enhances is created,
   * such as the cbz enhancer, which maps a cfi of the book onto the items it
   * splits it into.
   */
  it("is its cfi as the enhancers resolve it", async () => {
    const cfi = "epubcfi(/6/2[0]!/4/2)"
    const reader = createTestReader({
      cfi,
      numberOfAdjacentSpineItemToPreLoad: 0,
    })

    reader.hookManager.register("cfi.beforeResolve", ({ cfi }) =>
      cfi.replace("/6/2[0]!", "/6/4[1]!"),
    )

    const positions: string[] = []
    reader.navigation.readingPosition$.subscribe((position) => {
      positions.push(position)
    })

    mountTestReader(reader)

    await vi.waitFor(() =>
      expect(reader.navigation.getNavigation().spineItem).toBe(1),
    )

    const settled = await settledOn(reader)

    expect(settled.begin.spineItemIndex).toBe(1)
    expect(positions).toEqual([cfi])
  })
})
