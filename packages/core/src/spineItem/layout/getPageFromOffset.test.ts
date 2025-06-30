import { describe, expect, it } from "vitest"
import { getPageFromOffset } from "./getPageFromOffset"

describe("getPageFromOffset", () => {
  describe("basic functionality", () => {
    it("should return correct page for first page (offset 0)", () => {
      expect(getPageFromOffset(0, 100, 5)).toBe(0)
    })

    it("should return correct page for offset within first page", () => {
      expect(getPageFromOffset(50, 100, 5)).toBe(0)
      expect(getPageFromOffset(99, 100, 5)).toBe(0)
    })

    it("should return correct page for offset at exact page boundary", () => {
      expect(getPageFromOffset(100, 100, 5)).toBe(1)
      expect(getPageFromOffset(200, 100, 5)).toBe(2)
      expect(getPageFromOffset(300, 100, 5)).toBe(3)
    })

    it("should return correct page for offset within middle pages", () => {
      expect(getPageFromOffset(150, 100, 5)).toBe(1)
      expect(getPageFromOffset(250, 100, 5)).toBe(2)
      expect(getPageFromOffset(350, 100, 5)).toBe(3)
    })

    it("should return correct page for last page", () => {
      expect(getPageFromOffset(450, 100, 5)).toBe(4)
      expect(getPageFromOffset(499, 100, 5)).toBe(4)
    })
  })

  describe("edge cases - negative offset", () => {
    it("should return 0 for negative offset", () => {
      expect(getPageFromOffset(-1, 100, 5)).toBe(0)
      expect(getPageFromOffset(-50, 100, 5)).toBe(0)
      expect(getPageFromOffset(-1000, 100, 5)).toBe(0)
    })

    it("should return 0 for exactly 0 offset", () => {
      expect(getPageFromOffset(0, 100, 5)).toBe(0)
    })
  })

  describe("edge cases - offset beyond last page", () => {
    it("should return last page index when offset equals total width", () => {
      expect(getPageFromOffset(500, 100, 5)).toBe(4) // 5 pages, last index is 4
    })

    it("should return last page index when offset exceeds total width", () => {
      expect(getPageFromOffset(600, 100, 5)).toBe(4)
      expect(getPageFromOffset(1000, 100, 5)).toBe(4)
      expect(getPageFromOffset(Number.MAX_SAFE_INTEGER, 100, 5)).toBe(4)
    })
  })

  describe("different page widths", () => {
    it("should work with small page width", () => {
      expect(getPageFromOffset(0, 10, 3)).toBe(0)
      expect(getPageFromOffset(5, 10, 3)).toBe(0)
      expect(getPageFromOffset(10, 10, 3)).toBe(1)
      expect(getPageFromOffset(25, 10, 3)).toBe(2)
      expect(getPageFromOffset(30, 10, 3)).toBe(2) // Beyond last page
    })

    it("should work with large page width", () => {
      expect(getPageFromOffset(0, 1000, 3)).toBe(0)
      expect(getPageFromOffset(999, 1000, 3)).toBe(0)
      expect(getPageFromOffset(1000, 1000, 3)).toBe(1)
      expect(getPageFromOffset(2500, 1000, 3)).toBe(2)
      expect(getPageFromOffset(3000, 1000, 3)).toBe(2) // Beyond last page
    })

    it("should work with fractional page width", () => {
      expect(getPageFromOffset(0, 50.5, 4)).toBe(0)
      expect(getPageFromOffset(50, 50.5, 4)).toBe(0)
      expect(getPageFromOffset(51, 50.5, 4)).toBe(1)
      expect(getPageFromOffset(101, 50.5, 4)).toBe(2) // 101 is exactly at page boundary, so it's page 2
      expect(getPageFromOffset(152, 50.5, 4)).toBe(3) // 151.5 is page boundary, so 152 is page 3
    })
  })

  describe("different number of pages", () => {
    it("should work with single page", () => {
      expect(getPageFromOffset(0, 100, 1)).toBe(0)
      expect(getPageFromOffset(50, 100, 1)).toBe(0)
      expect(getPageFromOffset(100, 100, 1)).toBe(0) // Beyond last page
      expect(getPageFromOffset(200, 100, 1)).toBe(0) // Beyond last page
    })

    it("should work with two pages", () => {
      expect(getPageFromOffset(0, 100, 2)).toBe(0)
      expect(getPageFromOffset(99, 100, 2)).toBe(0)
      expect(getPageFromOffset(100, 100, 2)).toBe(1)
      expect(getPageFromOffset(199, 100, 2)).toBe(1)
      expect(getPageFromOffset(200, 100, 2)).toBe(1) // Beyond last page
    })

    it("should work with many pages", () => {
      const numberOfPages = 100
      const pageWidth = 50

      expect(getPageFromOffset(0, pageWidth, numberOfPages)).toBe(0)
      expect(getPageFromOffset(49, pageWidth, numberOfPages)).toBe(0)
      expect(getPageFromOffset(50, pageWidth, numberOfPages)).toBe(1)
      expect(getPageFromOffset(2475, pageWidth, numberOfPages)).toBe(49) // Page 50 (0-indexed)
      expect(getPageFromOffset(4950, pageWidth, numberOfPages)).toBe(99) // Last page
      expect(getPageFromOffset(5000, pageWidth, numberOfPages)).toBe(99) // Beyond last page
    })
  })

  describe("boundary conditions", () => {
    it("should handle exact page boundaries correctly", () => {
      const pageWidth = 100
      const numberOfPages = 5

      // Test each page boundary
      expect(getPageFromOffset(0, pageWidth, numberOfPages)).toBe(0)
      expect(getPageFromOffset(100, pageWidth, numberOfPages)).toBe(1)
      expect(getPageFromOffset(200, pageWidth, numberOfPages)).toBe(2)
      expect(getPageFromOffset(300, pageWidth, numberOfPages)).toBe(3)
      expect(getPageFromOffset(400, pageWidth, numberOfPages)).toBe(4)
      expect(getPageFromOffset(500, pageWidth, numberOfPages)).toBe(4) // Total width
    })

    it("should handle offsets just before page boundaries", () => {
      const pageWidth = 100
      const numberOfPages = 5

      expect(getPageFromOffset(99, pageWidth, numberOfPages)).toBe(0)
      expect(getPageFromOffset(199, pageWidth, numberOfPages)).toBe(1)
      expect(getPageFromOffset(299, pageWidth, numberOfPages)).toBe(2)
      expect(getPageFromOffset(399, pageWidth, numberOfPages)).toBe(3)
      expect(getPageFromOffset(499, pageWidth, numberOfPages)).toBe(4)
    })

    it("should handle offsets just after page boundaries", () => {
      const pageWidth = 100
      const numberOfPages = 5

      expect(getPageFromOffset(101, pageWidth, numberOfPages)).toBe(1)
      expect(getPageFromOffset(201, pageWidth, numberOfPages)).toBe(2)
      expect(getPageFromOffset(301, pageWidth, numberOfPages)).toBe(3)
      expect(getPageFromOffset(401, pageWidth, numberOfPages)).toBe(4)
    })
  })

  describe("special numeric values", () => {
    it("should handle zero page width gracefully", () => {
      // With zero page width, all offsets should return 0 or handle gracefully
      expect(getPageFromOffset(0, 0, 5)).toBe(0)
      expect(getPageFromOffset(100, 0, 5)).toBe(4) // Would be beyond all pages
    })

    it("should handle zero number of pages", () => {
      expect(getPageFromOffset(0, 100, 0)).toBe(0)
      expect(getPageFromOffset(100, 100, 0)).toBe(0)
    })

    it("should handle very small decimal values", () => {
      expect(getPageFromOffset(0.1, 100, 5)).toBe(0)
      expect(getPageFromOffset(0.9, 100, 5)).toBe(0)
      expect(getPageFromOffset(99.9, 100, 5)).toBe(0)
      expect(getPageFromOffset(100.1, 100, 5)).toBe(1)
    })

    it("should handle very large numbers", () => {
      const largeOffset = Number.MAX_SAFE_INTEGER
      const largePageWidth = 1000000
      const numberOfPages = 10

      expect(
        getPageFromOffset(largeOffset, largePageWidth, numberOfPages),
      ).toBe(9)
    })
  })

  describe("real-world scenarios", () => {
    it("should work with typical e-book page dimensions", () => {
      // Typical e-book: 600px width, 10 pages
      const pageWidth = 600
      const numberOfPages = 10

      expect(getPageFromOffset(0, pageWidth, numberOfPages)).toBe(0)
      expect(getPageFromOffset(300, pageWidth, numberOfPages)).toBe(0) // Middle of first page
      expect(getPageFromOffset(600, pageWidth, numberOfPages)).toBe(1) // Start of second page
      expect(getPageFromOffset(1200, pageWidth, numberOfPages)).toBe(2) // Start of third page
      expect(getPageFromOffset(5400, pageWidth, numberOfPages)).toBe(9) // Last page
      expect(getPageFromOffset(6000, pageWidth, numberOfPages)).toBe(9) // Beyond last page
    })

    it("should work with mobile device dimensions", () => {
      // Mobile: 375px width, 20 pages
      const pageWidth = 375
      const numberOfPages = 20

      expect(getPageFromOffset(0, pageWidth, numberOfPages)).toBe(0)
      expect(getPageFromOffset(187, pageWidth, numberOfPages)).toBe(0) // Middle of first page
      expect(getPageFromOffset(375, pageWidth, numberOfPages)).toBe(1) // Start of second page
      expect(getPageFromOffset(7125, pageWidth, numberOfPages)).toBe(19) // Last page
      expect(getPageFromOffset(7500, pageWidth, numberOfPages)).toBe(19) // Beyond last page
    })

    it("should work with desktop dimensions", () => {
      // Desktop: 1200px width, 5 pages
      const pageWidth = 1200
      const numberOfPages = 5

      expect(getPageFromOffset(0, pageWidth, numberOfPages)).toBe(0)
      expect(getPageFromOffset(600, pageWidth, numberOfPages)).toBe(0) // Middle of first page
      expect(getPageFromOffset(1200, pageWidth, numberOfPages)).toBe(1) // Start of second page
      expect(getPageFromOffset(4800, pageWidth, numberOfPages)).toBe(4) // Last page
      expect(getPageFromOffset(6000, pageWidth, numberOfPages)).toBe(4) // Beyond last page
    })
  })

  describe("mathematical edge cases", () => {
    it("should handle exact mathematical boundaries", () => {
      // Test where offset exactly equals page boundaries
      for (let page = 0; page < 5; page++) {
        const offset = page * 100
        expect(getPageFromOffset(offset, 100, 5)).toBe(page === 0 ? 0 : page)
      }
    })

    it("should handle floating point precision issues", () => {
      const pageWidth = 1 / 3 // 0.3333...
      const numberOfPages = 3

      expect(getPageFromOffset(0, pageWidth, numberOfPages)).toBe(0)
      expect(getPageFromOffset(0.2, pageWidth, numberOfPages)).toBe(0)
      expect(getPageFromOffset(0.4, pageWidth, numberOfPages)).toBe(1)
      expect(getPageFromOffset(0.8, pageWidth, numberOfPages)).toBe(2)
      expect(getPageFromOffset(1, pageWidth, numberOfPages)).toBe(2) // Beyond last page
    })
  })
})
