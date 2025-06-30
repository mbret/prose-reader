import { describe, expect, it } from "vitest"
import { SpineItemPosition } from "../types"
import { getSpineItemPageIndexFromSpineItemPosition } from "./getSpineItemPageIndexFromSpineItemPosition"

describe("getSpineItemPageIndexFromSpineItemPosition", () => {
  const createBaseParams = () => ({
    itemWidth: 1000,
    itemHeight: 800,
    position: new SpineItemPosition({ x: 0, y: 0 }),
    isUsingVerticalWriting: false,
    pageWidth: 500,
    pageHeight: 400,
    pageTurnDirection: "horizontal" as const,
    pageTurnMode: "controlled" as const,
    isRTL: false,
  })

  describe("horizontal LTR (Left-to-Right) scenarios", () => {
    it("should return 0 for position at start", () => {
      const params = createBaseParams()
      expect(getSpineItemPageIndexFromSpineItemPosition(params)).toBe(0)
    })

    it("should return 0 for position within first page", () => {
      const params = {
        ...createBaseParams(),
        position: new SpineItemPosition({ x: 250, y: 0 }),
      }
      expect(getSpineItemPageIndexFromSpineItemPosition(params)).toBe(0)
    })

    it("should return 1 for position at second page boundary", () => {
      const params = {
        ...createBaseParams(),
        position: new SpineItemPosition({ x: 500, y: 0 }),
      }
      expect(getSpineItemPageIndexFromSpineItemPosition(params)).toBe(1)
    })

    it("should return 1 for position within second page", () => {
      const params = {
        ...createBaseParams(),
        position: new SpineItemPosition({ x: 750, y: 0 }),
      }
      expect(getSpineItemPageIndexFromSpineItemPosition(params)).toBe(1)
    })

    it("should handle multiple pages correctly", () => {
      const params = {
        ...createBaseParams(),
        itemWidth: 2500,
        pageWidth: 500,
      }

      // Test each page
      expect(
        getSpineItemPageIndexFromSpineItemPosition({
          ...params,
          position: new SpineItemPosition({ x: 0, y: 0 }),
        }),
      ).toBe(0)
      expect(
        getSpineItemPageIndexFromSpineItemPosition({
          ...params,
          position: new SpineItemPosition({ x: 500, y: 0 }),
        }),
      ).toBe(1)
      expect(
        getSpineItemPageIndexFromSpineItemPosition({
          ...params,
          position: new SpineItemPosition({ x: 1000, y: 0 }),
        }),
      ).toBe(2)
      expect(
        getSpineItemPageIndexFromSpineItemPosition({
          ...params,
          position: new SpineItemPosition({ x: 1500, y: 0 }),
        }),
      ).toBe(3)
      expect(
        getSpineItemPageIndexFromSpineItemPosition({
          ...params,
          position: new SpineItemPosition({ x: 2000, y: 0 }),
        }),
      ).toBe(4)
    })
  })

  describe("horizontal RTL (Right-to-Left) scenarios", () => {
    it("should reverse page index for RTL", () => {
      const params = {
        ...createBaseParams(),
        isRTL: true,
        itemWidth: 1000,
        pageWidth: 500, // 2 pages total
      }

      // In RTL, first position should return last page index
      expect(
        getSpineItemPageIndexFromSpineItemPosition({
          ...params,
          position: new SpineItemPosition({ x: 0, y: 0 }),
        }),
      ).toBe(1) // numberOfPages - 1 - 0 = 2 - 1 - 0 = 1

      // Second page position should return first page index
      expect(
        getSpineItemPageIndexFromSpineItemPosition({
          ...params,
          position: new SpineItemPosition({ x: 500, y: 0 }),
        }),
      ).toBe(0) // numberOfPages - 1 - 1 = 2 - 1 - 1 = 0
    })

    it("should handle RTL with multiple pages", () => {
      const params = {
        ...createBaseParams(),
        isRTL: true,
        itemWidth: 2000,
        pageWidth: 500, // 4 pages total
      }

      expect(
        getSpineItemPageIndexFromSpineItemPosition({
          ...params,
          position: new SpineItemPosition({ x: 0, y: 0 }),
        }),
      ).toBe(3) // 4 - 1 - 0 = 3

      expect(
        getSpineItemPageIndexFromSpineItemPosition({
          ...params,
          position: new SpineItemPosition({ x: 500, y: 0 }),
        }),
      ).toBe(2) // 4 - 1 - 1 = 2

      expect(
        getSpineItemPageIndexFromSpineItemPosition({
          ...params,
          position: new SpineItemPosition({ x: 1000, y: 0 }),
        }),
      ).toBe(1) // 4 - 1 - 2 = 1

      expect(
        getSpineItemPageIndexFromSpineItemPosition({
          ...params,
          position: new SpineItemPosition({ x: 1500, y: 0 }),
        }),
      ).toBe(0) // 4 - 1 - 3 = 0
    })
  })

  describe("vertical writing scenarios", () => {
    it("should use Y position for vertical writing", () => {
      const params = {
        ...createBaseParams(),
        isUsingVerticalWriting: true,
        itemHeight: 1200,
        pageHeight: 400, // 3 pages
      }

      expect(
        getSpineItemPageIndexFromSpineItemPosition({
          ...params,
          position: new SpineItemPosition({ x: 100, y: 0 }),
        }),
      ).toBe(0)

      expect(
        getSpineItemPageIndexFromSpineItemPosition({
          ...params,
          position: new SpineItemPosition({ x: 100, y: 200 }),
        }),
      ).toBe(0)

      expect(
        getSpineItemPageIndexFromSpineItemPosition({
          ...params,
          position: new SpineItemPosition({ x: 100, y: 400 }),
        }),
      ).toBe(1)

      expect(
        getSpineItemPageIndexFromSpineItemPosition({
          ...params,
          position: new SpineItemPosition({ x: 100, y: 800 }),
        }),
      ).toBe(2)
    })

    it("should ignore RTL flag for vertical writing", () => {
      const params = {
        ...createBaseParams(),
        isUsingVerticalWriting: true,
        isRTL: true,
        itemHeight: 800,
        pageHeight: 400, // 2 pages
      }

      // Vertical writing should not be affected by RTL
      expect(
        getSpineItemPageIndexFromSpineItemPosition({
          ...params,
          position: new SpineItemPosition({ x: 100, y: 0 }),
        }),
      ).toBe(0)

      expect(
        getSpineItemPageIndexFromSpineItemPosition({
          ...params,
          position: new SpineItemPosition({ x: 100, y: 400 }),
        }),
      ).toBe(1)
    })
  })

  describe("page turn direction scenarios", () => {
    it("should handle vertical page turn direction", () => {
      const params = {
        ...createBaseParams(),
        pageTurnDirection: "vertical" as const,
        itemHeight: 1200,
        pageHeight: 400,
        // Still uses X position for page calculation, but number of pages calculated from height
      }

      expect(
        getSpineItemPageIndexFromSpineItemPosition({
          ...params,
          position: new SpineItemPosition({ x: 0, y: 100 }),
        }),
      ).toBe(0)

      expect(
        getSpineItemPageIndexFromSpineItemPosition({
          ...params,
          position: new SpineItemPosition({ x: 500, y: 100 }),
        }),
      ).toBe(1)

      // Note: vertical page turn direction affects page count calculation
      // but still uses X position unless isUsingVerticalWriting is true
    })

    it("should handle horizontal page turn direction", () => {
      const params = {
        ...createBaseParams(),
        pageTurnDirection: "horizontal" as const,
        itemWidth: 1500,
        pageWidth: 500,
      }

      expect(
        getSpineItemPageIndexFromSpineItemPosition({
          ...params,
          position: new SpineItemPosition({ x: 0, y: 100 }),
        }),
      ).toBe(0)

      expect(
        getSpineItemPageIndexFromSpineItemPosition({
          ...params,
          position: new SpineItemPosition({ x: 500, y: 100 }),
        }),
      ).toBe(1)

      expect(
        getSpineItemPageIndexFromSpineItemPosition({
          ...params,
          position: new SpineItemPosition({ x: 1000, y: 100 }),
        }),
      ).toBe(2)
    })
  })

  describe("page turn mode scenarios", () => {
    it("should handle scrollable mode with vertical direction", () => {
      const params = {
        ...createBaseParams(),
        pageTurnDirection: "vertical" as const,
        pageTurnMode: "scrollable" as const,
      }

      // In scrollable vertical mode, getSpineItemNumberOfPages returns 1
      expect(
        getSpineItemPageIndexFromSpineItemPosition({
          ...params,
          position: new SpineItemPosition({ x: 100, y: 0 }),
        }),
      ).toBe(0)

      expect(
        getSpineItemPageIndexFromSpineItemPosition({
          ...params,
          position: new SpineItemPosition({ x: 100, y: 500 }),
        }),
      ).toBe(0)
    })

    it("should handle controlled mode", () => {
      const params = {
        ...createBaseParams(),
        pageTurnMode: "controlled" as const,
        itemWidth: 1000,
        pageWidth: 500,
      }

      expect(
        getSpineItemPageIndexFromSpineItemPosition({
          ...params,
          position: new SpineItemPosition({ x: 0, y: 0 }),
        }),
      ).toBe(0)

      expect(
        getSpineItemPageIndexFromSpineItemPosition({
          ...params,
          position: new SpineItemPosition({ x: 500, y: 0 }),
        }),
      ).toBe(1)
    })
  })

  describe("safe position handling", () => {
    it("should clamp negative positions to 0", () => {
      const params = {
        ...createBaseParams(),
        position: new SpineItemPosition({ x: -100, y: -50 }),
      }

      expect(getSpineItemPageIndexFromSpineItemPosition(params)).toBe(0)
    })

    it("should clamp positions beyond item dimensions", () => {
      const params = {
        ...createBaseParams(),
        itemWidth: 1000,
        itemHeight: 800,
        position: new SpineItemPosition({ x: 1500, y: 1000 }),
        pageWidth: 500,
      }

      // Should clamp to itemWidth (1000) and return last page
      expect(getSpineItemPageIndexFromSpineItemPosition(params)).toBe(1)
    })

    it("should handle both negative and excessive positions", () => {
      const params = {
        ...createBaseParams(),
        itemWidth: 2000,
        pageWidth: 500,
        position: new SpineItemPosition({ x: -500, y: -200 }),
      }

      // Should clamp to 0 and return first page
      expect(getSpineItemPageIndexFromSpineItemPosition(params)).toBe(0)
    })
  })

  describe("edge cases", () => {
    it("should handle zero dimensions", () => {
      const params = {
        ...createBaseParams(),
        itemWidth: 0,
        itemHeight: 0,
        pageWidth: 100,
        pageHeight: 100,
      }

      expect(getSpineItemPageIndexFromSpineItemPosition(params)).toBe(0)
    })

    it("should handle zero page dimensions", () => {
      const params = {
        ...createBaseParams(),
        pageWidth: 0,
        pageHeight: 0,
      }

      expect(getSpineItemPageIndexFromSpineItemPosition(params)).toBe(0)
    })

    it("should handle single page scenarios", () => {
      const params = {
        ...createBaseParams(),
        itemWidth: 400,
        pageWidth: 500, // Page larger than item
      }

      expect(
        getSpineItemPageIndexFromSpineItemPosition({
          ...params,
          position: new SpineItemPosition({ x: 0, y: 0 }),
        }),
      ).toBe(0)

      expect(
        getSpineItemPageIndexFromSpineItemPosition({
          ...params,
          position: new SpineItemPosition({ x: 300, y: 0 }),
        }),
      ).toBe(0)
    })

    it("should handle fractional dimensions", () => {
      const params = {
        ...createBaseParams(),
        itemWidth: 1000.5,
        pageWidth: 333.33,
        position: new SpineItemPosition({ x: 666.66, y: 0 }),
      }

      expect(getSpineItemPageIndexFromSpineItemPosition(params)).toBe(2)
    })
  })

  describe("complex combinations", () => {
    it("should handle vertical writing + RTL", () => {
      const params = {
        ...createBaseParams(),
        isUsingVerticalWriting: true,
        isRTL: true,
        itemHeight: 1200,
        pageHeight: 400,
        position: new SpineItemPosition({ x: 100, y: 400 }),
      }

      // Vertical writing should ignore RTL and use Y position
      expect(getSpineItemPageIndexFromSpineItemPosition(params)).toBe(1)
    })

    it("should handle vertical direction + scrollable mode", () => {
      const params = {
        ...createBaseParams(),
        pageTurnDirection: "vertical" as const,
        pageTurnMode: "scrollable" as const,
        position: new SpineItemPosition({ x: 100, y: 500 }),
      }

      // Should return 0 because scrollable vertical mode always has 1 page
      expect(getSpineItemPageIndexFromSpineItemPosition(params)).toBe(0)
    })

    it("should handle RTL + controlled mode + horizontal direction", () => {
      const params = {
        ...createBaseParams(),
        isRTL: true,
        pageTurnMode: "controlled" as const,
        pageTurnDirection: "horizontal" as const,
        itemWidth: 1500,
        pageWidth: 500, // 3 pages
        position: new SpineItemPosition({ x: 500, y: 0 }),
      }

      // RTL: numberOfPages - 1 - pageIndex = 3 - 1 - 1 = 1
      expect(getSpineItemPageIndexFromSpineItemPosition(params)).toBe(1)
    })

    it("should handle out-of-bounds position + RTL", () => {
      const params = {
        ...createBaseParams(),
        isRTL: true,
        itemWidth: 1000,
        pageWidth: 500, // 2 pages
        position: new SpineItemPosition({ x: 1500, y: 0 }), // Beyond item width
      }

      // Position clamped to 1000, which gives page 1, RTL: 2 - 1 - 1 = 0
      expect(getSpineItemPageIndexFromSpineItemPosition(params)).toBe(0)
    })
  })

  describe("boundary conditions", () => {
    it("should handle exact page boundaries", () => {
      const params = {
        ...createBaseParams(),
        itemWidth: 1500,
        pageWidth: 500,
      }

      // Test exact boundaries
      expect(
        getSpineItemPageIndexFromSpineItemPosition({
          ...params,
          position: new SpineItemPosition({ x: 0, y: 0 }),
        }),
      ).toBe(0)

      expect(
        getSpineItemPageIndexFromSpineItemPosition({
          ...params,
          position: new SpineItemPosition({ x: 500, y: 0 }),
        }),
      ).toBe(1)

      expect(
        getSpineItemPageIndexFromSpineItemPosition({
          ...params,
          position: new SpineItemPosition({ x: 1000, y: 0 }),
        }),
      ).toBe(2)
    })

    it("should handle positions just before boundaries", () => {
      const params = {
        ...createBaseParams(),
        itemWidth: 1500,
        pageWidth: 500,
      }

      expect(
        getSpineItemPageIndexFromSpineItemPosition({
          ...params,
          position: new SpineItemPosition({ x: 499, y: 0 }),
        }),
      ).toBe(0)

      expect(
        getSpineItemPageIndexFromSpineItemPosition({
          ...params,
          position: new SpineItemPosition({ x: 999, y: 0 }),
        }),
      ).toBe(1)
    })

    it("should handle positions just after boundaries", () => {
      const params = {
        ...createBaseParams(),
        itemWidth: 1500,
        pageWidth: 500,
      }

      expect(
        getSpineItemPageIndexFromSpineItemPosition({
          ...params,
          position: new SpineItemPosition({ x: 501, y: 0 }),
        }),
      ).toBe(1)

      expect(
        getSpineItemPageIndexFromSpineItemPosition({
          ...params,
          position: new SpineItemPosition({ x: 1001, y: 0 }),
        }),
      ).toBe(2)
    })
  })

  describe("real-world scenarios", () => {
    it("should work with typical e-book dimensions", () => {
      const params = {
        ...createBaseParams(),
        itemWidth: 1200,
        itemHeight: 1600,
        pageWidth: 600,
        pageHeight: 800,
      }

      expect(
        getSpineItemPageIndexFromSpineItemPosition({
          ...params,
          position: new SpineItemPosition({ x: 300, y: 400 }),
        }),
      ).toBe(0)

      expect(
        getSpineItemPageIndexFromSpineItemPosition({
          ...params,
          position: new SpineItemPosition({ x: 700, y: 400 }),
        }),
      ).toBe(1)
    })

    it("should work with mobile device dimensions", () => {
      const params = {
        ...createBaseParams(),
        itemWidth: 750,
        itemHeight: 1334,
        pageWidth: 375,
        pageHeight: 667,
      }

      expect(
        getSpineItemPageIndexFromSpineItemPosition({
          ...params,
          position: new SpineItemPosition({ x: 200, y: 300 }),
        }),
      ).toBe(0)

      expect(
        getSpineItemPageIndexFromSpineItemPosition({
          ...params,
          position: new SpineItemPosition({ x: 500, y: 300 }),
        }),
      ).toBe(1)
    })

    it("should work with vertical reading (manga style)", () => {
      const params = {
        ...createBaseParams(),
        isUsingVerticalWriting: true,
        isRTL: true, // Common for Japanese manga
        itemWidth: 800,
        itemHeight: 2400,
        pageWidth: 800,
        pageHeight: 600,
      }

      expect(
        getSpineItemPageIndexFromSpineItemPosition({
          ...params,
          position: new SpineItemPosition({ x: 400, y: 300 }),
        }),
      ).toBe(0)

      expect(
        getSpineItemPageIndexFromSpineItemPosition({
          ...params,
          position: new SpineItemPosition({ x: 400, y: 900 }),
        }),
      ).toBe(1)

      expect(
        getSpineItemPageIndexFromSpineItemPosition({
          ...params,
          position: new SpineItemPosition({ x: 400, y: 1500 }),
        }),
      ).toBe(2)
    })
  })
})
