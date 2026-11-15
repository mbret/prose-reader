import { describe, expect, it, vi } from "vitest"
import {
  clampPositionInSpineItem,
  SpineItemPageGeometry,
  type SpineItemPageGeometryParams,
} from "./SpineItemPageGeometry"
import { SpineItemPosition } from "./types"

const createGeometry = ({
  isUsingVerticalWriting = false,
  ...params
}: Partial<Omit<SpineItemPageGeometryParams, "isUsingVerticalWriting">> & {
  isUsingVerticalWriting?: boolean
} = {}) =>
  new SpineItemPageGeometry({
    itemSize: { width: 1000, height: 800 },
    pageSize: { width: 500, height: 400 },
    isUsingVerticalWriting: () => isUsingVerticalWriting,
    isRTL: false,
    pageTurnDirection: "horizontal",
    pageTurnMode: "controlled",
    ...params,
  })

const position = (x: number, y: number) => new SpineItemPosition({ x, y })

describe("SpineItemPageGeometry", () => {
  describe("numberOfPages", () => {
    it("counts whole pages across the width", () => {
      expect(
        createGeometry({ itemSize: { width: 2500, height: 400 } })
          .numberOfPages,
      ).toBe(5)
      expect(
        createGeometry({ itemSize: { width: 1200, height: 400 } })
          .numberOfPages,
      ).toBe(2)
    })

    it("counts pages down the height for vertical writing", () => {
      expect(
        createGeometry({
          isUsingVerticalWriting: true,
          itemSize: { width: 500, height: 1200 },
        }).numberOfPages,
      ).toBe(3)
    })

    it("counts pages down the height for a vertical page turn", () => {
      expect(
        createGeometry({
          pageTurnDirection: "vertical",
          itemSize: { width: 500, height: 1200 },
        }).numberOfPages,
      ).toBe(3)
    })

    it("has one page when the pageTurnMode setting scrolls vertically", () => {
      expect(
        createGeometry({
          pageTurnDirection: "vertical",
          pageTurnMode: "scrollable",
          itemSize: { width: 500, height: 1200 },
        }).numberOfPages,
      ).toBe(1)
    })

    it("has one page while the item or the page has no size", () => {
      expect(
        createGeometry({ itemSize: { width: 0, height: 0 } }).numberOfPages,
      ).toBe(1)
      expect(
        createGeometry({ pageSize: { width: 0, height: 0 } }).numberOfPages,
      ).toBe(1)
      expect(
        createGeometry({ itemSize: { width: 400, height: 400 } }).numberOfPages,
      ).toBe(1)
    })
  })

  describe("getPageIndexFromPosition", () => {
    it("gives the page holding a position, a page start included", () => {
      const geometry = createGeometry({
        itemSize: { width: 2500, height: 400 },
      })

      expect(geometry.getPageIndexFromPosition(position(0, 0))).toBe(0)
      expect(geometry.getPageIndexFromPosition(position(499, 0))).toBe(0)
      expect(geometry.getPageIndexFromPosition(position(500, 0))).toBe(1)
      expect(geometry.getPageIndexFromPosition(position(750, 0))).toBe(1)
      expect(geometry.getPageIndexFromPosition(position(2000, 0))).toBe(4)
      expect(geometry.getPageIndexFromPosition(position(2499, 0))).toBe(4)
    })

    it("gives the nearest page for a position outside the item", () => {
      const geometry = createGeometry({
        itemSize: { width: 1000, height: 800 },
      })

      expect(geometry.getPageIndexFromPosition(position(-100, -50))).toBe(0)
      expect(geometry.getPageIndexFromPosition(position(1000, 0))).toBe(1)
      expect(geometry.getPageIndexFromPosition(position(1500, 1000))).toBe(1)
    })

    it("counts pages from the right in a right-to-left book", () => {
      const geometry = createGeometry({
        isRTL: true,
        itemSize: { width: 2000, height: 400 },
      })

      expect(geometry.getPageIndexFromPosition(position(0, 0))).toBe(3)
      expect(geometry.getPageIndexFromPosition(position(500, 0))).toBe(2)
      expect(geometry.getPageIndexFromPosition(position(1000, 0))).toBe(1)
      expect(geometry.getPageIndexFromPosition(position(1500, 0))).toBe(0)
    })

    it("gives the nearest page for a position outside a right-to-left item", () => {
      const geometry = createGeometry({
        isRTL: true,
        itemSize: { width: 2000, height: 400 },
      })

      expect(geometry.getPageIndexFromPosition(position(-100, 0))).toBe(3)
      expect(geometry.getPageIndexFromPosition(position(2500, 0))).toBe(0)
    })

    it("reads y for vertical writing, whatever the book direction", () => {
      for (const isRTL of [false, true]) {
        const geometry = createGeometry({
          isRTL,
          isUsingVerticalWriting: true,
          itemSize: { width: 500, height: 1200 },
        })

        expect(geometry.getPageIndexFromPosition(position(100, 0))).toBe(0)
        expect(geometry.getPageIndexFromPosition(position(100, 200))).toBe(0)
        expect(geometry.getPageIndexFromPosition(position(100, 400))).toBe(1)
        expect(geometry.getPageIndexFromPosition(position(100, 800))).toBe(2)
      }
    })

    it("reads x for horizontal writing with a vertical page turn", () => {
      const geometry = createGeometry({
        pageTurnDirection: "vertical",
        itemSize: { width: 1000, height: 1200 },
      })

      expect(geometry.getPageIndexFromPosition(position(0, 100))).toBe(0)
      expect(geometry.getPageIndexFromPosition(position(500, 100))).toBe(1)
    })

    it("is always the first page when the book scrolls vertically", () => {
      const geometry = createGeometry({
        pageTurnDirection: "vertical",
        pageTurnMode: "scrollable",
      })

      expect(geometry.getPageIndexFromPosition(position(100, 0))).toBe(0)
      expect(geometry.getPageIndexFromPosition(position(100, 500))).toBe(0)
    })

    it("is the first page while the item or the page has no size", () => {
      expect(
        createGeometry({
          itemSize: { width: 0, height: 0 },
        }).getPageIndexFromPosition(position(300, 0)),
      ).toBe(0)
      expect(
        createGeometry({
          pageSize: { width: 0, height: 0 },
        }).getPageIndexFromPosition(position(300, 0)),
      ).toBe(0)
    })

    it("handles a page width that is not a whole number", () => {
      const geometry = createGeometry({
        itemSize: { width: 202, height: 400 },
        pageSize: { width: 50.5, height: 400 },
      })

      expect(geometry.getPageIndexFromPosition(position(50, 0))).toBe(0)
      expect(geometry.getPageIndexFromPosition(position(51, 0))).toBe(1)
      expect(geometry.getPageIndexFromPosition(position(101, 0))).toBe(2)
      expect(geometry.getPageIndexFromPosition(position(152, 0))).toBe(3)
    })
  })

  describe("getPositionFromPageIndex", () => {
    it("gives the left edge of a page across the item", () => {
      const geometry = createGeometry({
        itemSize: { width: 1500, height: 400 },
      })

      expect(geometry.getPositionFromPageIndex(0)).toMatchObject({
        x: 0,
        y: 0,
      })
      expect(geometry.getPositionFromPageIndex(2)).toMatchObject({
        x: 1000,
        y: 0,
      })
    })

    it("gives the last page for an index after it", () => {
      const geometry = createGeometry({
        itemSize: { width: 1500, height: 400 },
      })

      expect(geometry.getPositionFromPageIndex(7)).toMatchObject({
        x: 1000,
        y: 0,
      })
    })

    it("places the first page at the right edge in a right-to-left book", () => {
      const geometry = createGeometry({
        isRTL: true,
        itemSize: { width: 1500, height: 400 },
      })

      expect(geometry.getPositionFromPageIndex(0)).toMatchObject({ x: 1000 })
      expect(geometry.getPositionFromPageIndex(1)).toMatchObject({ x: 500 })
      expect(geometry.getPositionFromPageIndex(2)).toMatchObject({ x: 0 })
      expect(geometry.getPositionFromPageIndex(7)).toMatchObject({ x: 0 })
    })

    it("never starts a page outside an item narrower than a page", () => {
      expect(
        createGeometry({
          isRTL: true,
          itemSize: { width: 0, height: 0 },
        }).getPositionFromPageIndex(0),
      ).toMatchObject({ x: 0, y: 0 })
    })

    it("goes down the item for vertical writing", () => {
      const geometry = createGeometry({
        isUsingVerticalWriting: true,
        isRTL: true,
        itemSize: { width: 500, height: 1200 },
      })

      expect(geometry.getPositionFromPageIndex(1)).toMatchObject({
        x: 0,
        y: 400,
      })
    })

    it("is the start of the page it gives the index of", () => {
      for (const params of [
        { itemSize: { width: 2000, height: 400 } },
        { itemSize: { width: 2000, height: 400 }, isRTL: true },
        {
          itemSize: { width: 500, height: 1600 },
          isUsingVerticalWriting: true,
        },
      ]) {
        const geometry = createGeometry(params)

        for (
          let pageIndex = 0;
          pageIndex < geometry.numberOfPages;
          pageIndex += 1
        ) {
          expect(
            geometry.getPageIndexFromPosition(
              geometry.getPositionFromPageIndex(pageIndex),
            ),
          ).toBe(pageIndex)
        }
      }
    })
  })

  describe("getPositionInPage", () => {
    it("is relative to the start of the page", () => {
      expect(
        createGeometry({
          itemSize: { width: 1500, height: 400 },
        }).getPositionInPage(position(1100, 30), 2),
      ).toMatchObject({ x: 100, y: 30 })
      expect(
        createGeometry({
          isRTL: true,
          itemSize: { width: 1500, height: 400 },
        }).getPositionInPage(position(1100, 30), 0),
      ).toMatchObject({ x: 100, y: 30 })
      expect(
        createGeometry({
          isUsingVerticalWriting: true,
          itemSize: { width: 500, height: 1200 },
        }).getPositionInPage(position(30, 900), 2),
      ).toMatchObject({ x: 30, y: 100 })
    })
  })

  describe("snapPositionToPageGrid", () => {
    it("snaps each axis to the start of its page", () => {
      const geometry = createGeometry({
        itemSize: { width: 1500, height: 800 },
      })

      expect(geometry.snapPositionToPageGrid(position(0, 0))).toMatchObject({
        x: 0,
        y: 0,
      })
      expect(geometry.snapPositionToPageGrid(position(740, 410))).toMatchObject(
        {
          x: 500,
          y: 400,
        },
      )
    })

    it("holds a position outside the item on its first or last page", () => {
      const geometry = createGeometry({
        itemSize: { width: 1500, height: 800 },
      })

      expect(
        geometry.snapPositionToPageGrid(position(-200, -10)),
      ).toMatchObject({
        x: 0,
        y: 0,
      })
      expect(
        geometry.snapPositionToPageGrid(position(2000, 900)),
      ).toMatchObject({
        x: 1000,
        y: 400,
      })
    })

    it("is the item's start while the page has no size", () => {
      expect(
        createGeometry({
          pageSize: { width: 0, height: 0 },
        }).snapPositionToPageGrid(position(300, 300)),
      ).toMatchObject({ x: 0, y: 0 })
    })
  })

  describe("the writing mode", () => {
    it("is read once, and not to snap a position to the page grid", () => {
      const isUsingVerticalWriting = vi.fn(() => false)
      const geometry = new SpineItemPageGeometry({
        itemSize: { width: 1500, height: 400 },
        pageSize: { width: 500, height: 400 },
        isUsingVerticalWriting,
        isRTL: false,
        pageTurnDirection: "horizontal",
        pageTurnMode: "controlled",
      })

      geometry.snapPositionToPageGrid(position(700, 0))

      expect(isUsingVerticalWriting).not.toHaveBeenCalled()

      geometry.getPageIndexFromPosition(position(700, 0))
      geometry.getPositionFromPageIndex(1)
      geometry.getPositionInPage(position(700, 0), 1)

      expect(isUsingVerticalWriting).toHaveBeenCalledTimes(1)
    })
  })
})

describe("clampPositionInSpineItem", () => {
  it("holds a position within the item", () => {
    const itemSize = { width: 1000, height: 800 }

    expect(clampPositionInSpineItem(position(-5, 900), itemSize)).toMatchObject(
      { x: 0, y: 800 },
    )
    expect(clampPositionInSpineItem(position(300, 20), itemSize)).toMatchObject(
      { x: 300, y: 20 },
    )
  })
})
