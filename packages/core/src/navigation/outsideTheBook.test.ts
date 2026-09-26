// @vitest-environment jsdom
import { skip } from "rxjs"
import { describe, expect, it } from "vitest"
import {
  createTestReader,
  installReaderTestEnvironment,
  mountTestReader,
  settledOn,
} from "../tests/readerHarness"
import type { NavigationTarget, ReadingPosition } from "./types"

installReaderTestEnvironment()

/**
 * Targets naming nothing in the test book, which has two items. The likely one
 * is a saved position gone stale because the book changed, or corrupted.
 */
const targetsNamingNothing: [string, NavigationTarget][] = [
  ["a malformed cfi", { type: "cfi", value: "not a cfi" }],
  ["an empty cfi", { type: "cfi", value: "" }],
  // Its start reads like the first item's cfi.
  [
    "a cfi with text after its end",
    { type: "cfi", value: "epubcfi(/6/2!)junk" },
  ],
  [
    "a cfi of an item the book does not have",
    { type: "cfi", value: "epubcfi(/6/999!/4/2/1:0)" },
  ],
  ["a spine item before the first", { type: "spineItem", value: -1 }],
  ["a spine item after the last", { type: "spineItem", value: 2 }],
  [
    "a spine item id the book does not have",
    { type: "spineItem", value: "missing" },
  ],
  [
    "a selector in an item the book does not have",
    {
      type: "selector",
      value: { spineItem: "missing", find: () => undefined },
    },
  ],
]

describe("a navigation whose target names nothing in the book", () => {
  it.each(targetsNamingNothing)(
    "is ignored for %s, and the reader keeps navigating",
    async (_, target) => {
      const reader = createTestReader()

      mountTestReader(reader)
      reader.navigation.goToSpineItem({ indexOrId: 1, animation: false })
      await settledOn(reader, 1)

      const navigations: string[] = []
      const readingPositions: ReadingPosition[] = []

      // Both replay the current one on subscription.
      reader.navigation.navigation$
        .pipe(skip(1))
        .subscribe(({ triggeredBy }) => {
          navigations.push(triggeredBy)
        })
      reader.navigation.readingPosition$.pipe(skip(1)).subscribe((position) => {
        readingPositions.push(position)
      })

      reader.navigation.navigate({ target, animation: false })

      /**
       * A navigation happens synchronously, so had it happened, both would
       * have emitted by now. The reader has nowhere to go: it stays where it
       * is, and so does the reading position.
       */
      expect(navigations).toEqual([])
      expect(readingPositions).toEqual([])

      reader.navigation.goToSpineItem({ indexOrId: 0, animation: false })

      expect(navigations).toEqual(["user"])

      const settled = await settledOn(reader, 0)

      // The start of the book.
      expect(readingPositions).toEqual([
        { cfi: settled.begin.cfi, percentageEstimateOfBook: 0 },
      ])
    },
  )
})
