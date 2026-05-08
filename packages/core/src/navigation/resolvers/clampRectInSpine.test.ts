import { describe, expect, it } from "vitest"
import type { Spine } from "../../spine/Spine"
import type { SpineItemsManager } from "../../spine/SpineItemsManager"
import { SpinePosition, UnboundSpinePosition } from "../../spine/types"
import { clampPositionToFitViewportInSpine } from "./clampPositionToFitViewportInSpine"
import { clampRectInSpine } from "./clampRectInSpine"

type LayoutInfo = {
  left: number
  right: number
  top: number
  bottom: number
  width: number
  height: number
  x: number
  y: number
}

type Fixture = {
  spineItemsManager: SpineItemsManager
  spine: Spine
}

const buildFixture = (lastItemLayout: Partial<LayoutInfo>): Fixture => {
  const layout: LayoutInfo = {
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    width: 0,
    height: 0,
    x: 0,
    y: 0,
    ...lastItemLayout,
  }

  const lastItem = { __isFakeSpineItem: true }

  // The clamp helpers only consume `.get()` and `.items.length`.
  const spineItemsManager = {
    get: (index: number) => (index === 0 ? lastItem : undefined),
    items: { length: 1 },
  } as unknown as SpineItemsManager

  // Only `getSpineItemSpineLayoutInfo` is consumed.
  const spine = {
    getSpineItemSpineLayoutInfo: () => layout,
  } as unknown as Spine

  return { spineItemsManager, spine }
}

describe(`clampRectInSpine`, () => {
  describe(`LTR`, () => {
    const { spineItemsManager, spine } = buildFixture({
      left: 0,
      right: 1000,
      bottom: 600,
    })

    it(`clamps positive x to right - size.width and y to bottom - size.height`, () => {
      const result = clampRectInSpine({
        position: new SpinePosition({ x: 9999, y: 9999 }),
        size: { width: 200, height: 100 },
        isRTL: false,
        spineItemsManager,
        spine,
        viewportWidth: 200,
      })

      expect(result).toEqual(new SpinePosition({ x: 800, y: 500 }))
    })

    it(`clamps negative x and y to 0`, () => {
      const result = clampRectInSpine({
        position: new UnboundSpinePosition({ x: -50, y: -50 }),
        size: { width: 200, height: 100 },
        isRTL: false,
        spineItemsManager,
        spine,
        viewportWidth: 200,
      })

      expect(result).toEqual(new SpinePosition({ x: 0, y: 0 }))
    })

    it(`leaves an in-bounds position untouched`, () => {
      const result = clampRectInSpine({
        position: new SpinePosition({ x: 250, y: 100 }),
        size: { width: 200, height: 100 },
        isRTL: false,
        spineItemsManager,
        spine,
        viewportWidth: 200,
      })

      expect(result).toEqual(new SpinePosition({ x: 250, y: 100 }))
    })
  })

  describe(`RTL`, () => {
    const { spineItemsManager, spine } = buildFixture({
      left: -1000,
      right: 200,
      bottom: 600,
    })

    it(`clamps x to viewportWidth - size.width on the right edge`, () => {
      const result = clampRectInSpine({
        position: new UnboundSpinePosition({ x: 9999, y: 0 }),
        size: { width: 200, height: 100 },
        isRTL: true,
        spineItemsManager,
        spine,
        viewportWidth: 200,
      })

      expect(result).toEqual(new SpinePosition({ x: 0, y: 0 }))
    })

    it(`clamps x to lastItem.left on the left edge`, () => {
      const result = clampRectInSpine({
        position: new UnboundSpinePosition({ x: -9999, y: 0 }),
        size: { width: 200, height: 100 },
        isRTL: true,
        spineItemsManager,
        spine,
        viewportWidth: 200,
      })

      expect(result).toEqual(new SpinePosition({ x: -1000, y: 0 }))
    })

    it(`clamps y to bottom - size.height`, () => {
      const result = clampRectInSpine({
        position: new UnboundSpinePosition({ x: -100, y: 9999 }),
        size: { width: 200, height: 100 },
        isRTL: true,
        spineItemsManager,
        spine,
        viewportWidth: 200,
      })

      expect(result).toEqual(new SpinePosition({ x: -100, y: 500 }))
    })
  })
})

describe(`clampRectInSpine with size 1×1 (point clamp)`, () => {
  describe(`LTR`, () => {
    const { spineItemsManager, spine } = buildFixture({
      left: 0,
      right: 1000,
      bottom: 600,
    })

    it(`clamps to right - 1 and bottom - 1 on the upper edge`, () => {
      const result = clampRectInSpine({
        position: new SpinePosition({ x: 9999, y: 9999 }),
        size: { width: 1, height: 1 },
        isRTL: false,
        spineItemsManager,
        spine,
        viewportWidth: 200,
      })

      expect(result).toEqual(new SpinePosition({ x: 999, y: 599 }))
    })
  })

  describe(`RTL`, () => {
    const { spineItemsManager, spine } = buildFixture({
      left: -1000,
      right: 200,
      bottom: 600,
    })

    /**
     * Regression: prior to the rect-based unification a "point" RTL clamp
     * returned `viewportWidth` for the upper bound, which was inconsistent
     * with LTR's `right - 1` convention and let the point sit one pixel
     * outside the spine on the right edge.
     */
    it(`clamps x to viewportWidth - 1 on the right edge`, () => {
      const result = clampRectInSpine({
        position: new UnboundSpinePosition({ x: 9999, y: 0 }),
        size: { width: 1, height: 1 },
        isRTL: true,
        spineItemsManager,
        spine,
        viewportWidth: 200,
      })

      expect(result).toEqual(new SpinePosition({ x: 199, y: 0 }))
    })
  })
})

describe(`clampPositionToFitViewportInSpine`, () => {
  describe(`LTR`, () => {
    const { spineItemsManager, spine } = buildFixture({
      left: 0,
      right: 1000,
      bottom: 600,
    })

    it(`clamps the viewport flush with the right and bottom edges`, () => {
      const result = clampPositionToFitViewportInSpine({
        position: new SpinePosition({ x: 9999, y: 9999 }),
        isRTL: false,
        pageSizeHeight: 100,
        spineItemsManager,
        spine,
        visibleAreaRectWidth: 200,
      })

      expect(result).toEqual(new SpinePosition({ x: 800, y: 500 }))
    })

    it(`clamps negative coordinates to 0`, () => {
      const result = clampPositionToFitViewportInSpine({
        position: new UnboundSpinePosition({ x: -50, y: -50 }),
        isRTL: false,
        pageSizeHeight: 100,
        spineItemsManager,
        spine,
        visibleAreaRectWidth: 200,
      })

      expect(result).toEqual(new SpinePosition({ x: 0, y: 0 }))
    })
  })

  describe(`RTL`, () => {
    const { spineItemsManager, spine } = buildFixture({
      left: -1000,
      right: 200,
      bottom: 600,
    })

    it(`clamps x to 0 on the right edge`, () => {
      const result = clampPositionToFitViewportInSpine({
        position: new UnboundSpinePosition({ x: 9999, y: 0 }),
        isRTL: true,
        pageSizeHeight: 100,
        spineItemsManager,
        spine,
        visibleAreaRectWidth: 200,
      })

      expect(result).toEqual(new SpinePosition({ x: 0, y: 0 }))
    })

    it(`clamps x to lastItem.left on the left edge`, () => {
      const result = clampPositionToFitViewportInSpine({
        position: new UnboundSpinePosition({ x: -9999, y: 0 }),
        isRTL: true,
        pageSizeHeight: 100,
        spineItemsManager,
        spine,
        visibleAreaRectWidth: 200,
      })

      expect(result).toEqual(new SpinePosition({ x: -1000, y: 0 }))
    })
  })
})
