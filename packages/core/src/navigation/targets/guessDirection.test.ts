import { describe, expect, it } from "vitest"
import type { ReaderSettingsManager } from "../../settings/ReaderSettingsManager"
import type { SpineLocator } from "../../spine/locator/SpineLocator"
import type { SpineItemsManager } from "../../spine/SpineItemsManager"
import { SpinePosition } from "../../spine/types"
import type { InternalNavigationEntry } from "../types"
import { guessDirection } from "./guessDirection"

type Direction = "forward" | "backward"

/** Four spine items of 200 px, stacked: a position past them is in none. */
const heightOfSpineItem = 200
const numberOfSpineItems = 4

const guess = ({
  pageTurnMode,
  pageTurnDirection = "vertical",
  position,
  previousNavigation,
}: {
  pageTurnMode: "scrollable" | "controlled"
  pageTurnDirection?: "vertical" | "horizontal"
  position: { x: number; y: number }
  previousNavigation: {
    spineItem?: number
    position?: { x: number; y: number }
    directionFromLastNavigation?: Direction
  }
}) => {
  const spineLocator = {
    getSpineItemFromPosition: ({ y }: { y: number }) => {
      const index = Math.floor(y / heightOfSpineItem)

      return index >= 0 && index < numberOfSpineItems ? { index } : undefined
    },
  }
  const spineItemsManager = {
    getSpineItemIndex: (spineItem: { index: number } | number | undefined) =>
      typeof spineItem === "number" ? spineItem : spineItem?.index,
  }

  return guessDirection({
    position: new SpinePosition(position),
    // `guessDirection` only reads the members given here, so partial objects
    // stand in for the real ones.
    previousNavigation: {
      ...previousNavigation,
      position: new SpinePosition(
        previousNavigation.position ?? { x: 0, y: 0 },
      ),
    } as unknown as InternalNavigationEntry,
    settings: {
      values: {
        computedPageTurnMode: pageTurnMode,
        computedPageTurnDirection: pageTurnDirection,
      },
    } as unknown as ReaderSettingsManager,
    spineItemsManager: spineItemsManager as unknown as SpineItemsManager,
    spineLocator: spineLocator as unknown as SpineLocator,
  })
}

const inSpineItem = (index: number, distance = 50) => ({
  x: 0,
  y: index * heightOfSpineItem + distance,
})

describe("the direction of a navigation to a position", () => {
  it("is forward after a navigation that has no spine item", () => {
    for (const pageTurnMode of ["scrollable", "controlled"] as const) {
      expect(
        guess({
          pageTurnMode,
          position: inSpineItem(2),
          previousNavigation: { directionFromLastNavigation: "backward" },
        }),
      ).toBe("forward")
    }
  })

  describe("in a book that scrolls", () => {
    it.each<{
      name: string
      previousSpineItem: number
      previousDirection: Direction | undefined
      position: { x: number; y: number }
      direction: Direction
    }>([
      {
        name: "keeps forward inside the spine item, also for a move up",
        previousSpineItem: 2,
        previousDirection: "forward",
        position: inSpineItem(2, 10),
        direction: "forward",
      },
      {
        name: "keeps backward inside the spine item, also for a move down",
        previousSpineItem: 2,
        previousDirection: "backward",
        position: inSpineItem(2, 150),
        direction: "backward",
      },
      {
        name: "is forward inside the spine item when the navigation before has no direction",
        previousSpineItem: 2,
        previousDirection: undefined,
        position: inSpineItem(2),
        direction: "forward",
      },
      {
        name: "is forward into the next spine item",
        previousSpineItem: 2,
        previousDirection: "backward",
        position: inSpineItem(3),
        direction: "forward",
      },
      {
        name: "is backward into the spine item before",
        previousSpineItem: 2,
        previousDirection: "forward",
        position: inSpineItem(1),
        direction: "backward",
      },
      {
        name: "is forward over several spine items",
        previousSpineItem: 0,
        previousDirection: "backward",
        position: inSpineItem(3),
        direction: "forward",
      },
      {
        name: "is backward over several spine items",
        previousSpineItem: 3,
        previousDirection: "forward",
        position: inSpineItem(0),
        direction: "backward",
      },
      {
        name: "keeps the direction for a position in no spine item",
        previousSpineItem: 3,
        previousDirection: "backward",
        position: inSpineItem(numberOfSpineItems),
        direction: "backward",
      },
    ])(
      "$name",
      ({ previousSpineItem, previousDirection, position, direction }) => {
        expect(
          guess({
            pageTurnMode: "scrollable",
            position,
            previousNavigation: {
              spineItem: previousSpineItem,
              // In the middle of its spine item: a move up or down inside it.
              position: inSpineItem(previousSpineItem, 100),
              directionFromLastNavigation: previousDirection,
            },
          }),
        ).toBe(direction)
      },
    )
  })

  describe("in a book whose pages turn", () => {
    it.each<{
      name: string
      pageTurnDirection: "vertical" | "horizontal"
      previousDirection: Direction
      previousPosition: { x: number; y: number }
      position: { x: number; y: number }
      direction: Direction
    }>([
      {
        name: "is forward further down, also inside the spine item",
        pageTurnDirection: "vertical",
        previousDirection: "backward",
        previousPosition: { x: 0, y: 450 },
        position: { x: 0, y: 460 },
        direction: "forward",
      },
      {
        name: "is backward further up, also inside the spine item",
        pageTurnDirection: "vertical",
        previousDirection: "forward",
        previousPosition: { x: 0, y: 450 },
        position: { x: 0, y: 440 },
        direction: "backward",
      },
      {
        name: "keeps backward at the same place",
        pageTurnDirection: "vertical",
        previousDirection: "backward",
        previousPosition: { x: 0, y: 450 },
        position: { x: 0, y: 450 },
        direction: "backward",
      },
      {
        name: "is forward further from the start of a horizontal book",
        pageTurnDirection: "horizontal",
        previousDirection: "backward",
        previousPosition: { x: 100, y: 0 },
        position: { x: 200, y: 0 },
        direction: "forward",
      },
      {
        name: "is backward nearer the start of a horizontal book",
        pageTurnDirection: "horizontal",
        previousDirection: "forward",
        previousPosition: { x: 200, y: 0 },
        position: { x: 100, y: 0 },
        direction: "backward",
      },
    ])(
      "$name",
      ({
        pageTurnDirection,
        previousDirection,
        previousPosition,
        position,
        direction,
      }) => {
        expect(
          guess({
            pageTurnMode: "controlled",
            pageTurnDirection,
            position,
            previousNavigation: {
              spineItem: 2,
              position: previousPosition,
              directionFromLastNavigation: previousDirection,
            },
          }),
        ).toBe(direction)
      },
    )
  })
})
