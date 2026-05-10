import { describe, expect, it } from "vitest"
import type { Spine } from "../../spine/Spine"
import type { SpineItemsManager } from "../../spine/SpineItemsManager"
import { SpinePosition, UnboundSpinePosition } from "../../spine/types"
import { clampRectInSpine, getBoundaryForRectInSpine } from "./clampRectInSpine"

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

/**
 * Single-item spine fixture: `firstItem === lastItem`, so the same
 * layout drives both the LTR right edge (`last.right`) and the RTL right
 * edge (`first.right`).
 */
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

  const item = { __isFakeSpineItem: true }

  const spineItemsManager = {
    get: (index: number) => (index === 0 ? item : undefined),
    items: { length: 1 },
  } as unknown as SpineItemsManager

  const spine = {
    getSpineItemSpineLayoutInfo: () => layout,
  } as unknown as Spine

  return { spineItemsManager, spine }
}

describe(`clampRectInSpine`, () => {
  describe(`empty spine`, () => {
    const spineItemsManager = {
      get: () => undefined,
      items: { length: 0 },
      // Cast: minimal spine items manager mock for boundary helper tests.
    } as unknown as SpineItemsManager
    const spine = {
      getSpineItemSpineLayoutInfo: () => {
        throw new Error(`should not be invoked when there are no spine items`)
      },
      // Cast: minimal spine mock; layout lookup must not be reached here.
    } as unknown as Spine

    it(`returns the origin without consulting layout info`, () => {
      const result = clampRectInSpine({
        position: new SpinePosition({ x: 9999, y: 9999 }),
        size: { width: 200, height: 100 },
        isRTL: false,
        spineItemsManager,
        spine,
      })

      expect(result).toEqual(new UnboundSpinePosition({ x: 0, y: 0 }))
    })
  })

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
      })

      expect(result).toEqual(new UnboundSpinePosition({ x: 800, y: 500 }))
    })

    it(`clamps negative x and y to 0`, () => {
      const result = clampRectInSpine({
        position: new UnboundSpinePosition({ x: -50, y: -50 }),
        size: { width: 200, height: 100 },
        isRTL: false,
        spineItemsManager,
        spine,
      })

      expect(result).toEqual(new UnboundSpinePosition({ x: 0, y: 0 }))
    })

    it(`leaves an in-bounds position untouched`, () => {
      const result = clampRectInSpine({
        position: new SpinePosition({ x: 250, y: 100 }),
        size: { width: 200, height: 100 },
        isRTL: false,
        spineItemsManager,
        spine,
      })

      expect(result).toEqual(new UnboundSpinePosition({ x: 250, y: 100 }))
    })
  })

  describe(`RTL`, () => {
    const { spineItemsManager, spine } = buildFixture({
      left: -1000,
      right: 200,
      bottom: 600,
    })

    it(`clamps x to first.right - size.width on the right edge`, () => {
      const result = clampRectInSpine({
        position: new UnboundSpinePosition({ x: 9999, y: 0 }),
        size: { width: 200, height: 100 },
        isRTL: true,
        spineItemsManager,
        spine,
      })

      expect(result).toEqual(new UnboundSpinePosition({ x: 0, y: 0 }))
    })

    it(`clamps x to lastItem.left on the left edge`, () => {
      const result = clampRectInSpine({
        position: new UnboundSpinePosition({ x: -9999, y: 0 }),
        size: { width: 200, height: 100 },
        isRTL: true,
        spineItemsManager,
        spine,
      })

      expect(result).toEqual(new UnboundSpinePosition({ x: -1000, y: 0 }))
    })

    it(`clamps y to bottom - size.height`, () => {
      const result = clampRectInSpine({
        position: new UnboundSpinePosition({ x: -100, y: 9999 }),
        size: { width: 200, height: 100 },
        isRTL: true,
        spineItemsManager,
        spine,
      })

      expect(result).toEqual(new UnboundSpinePosition({ x: -100, y: 500 }))
    })
  })

  /**
   * The `Math.max(0, …)` floors guarantee the function honours its
   * contract ("position … inside the spine") even when the rectangle is
   * larger than the spine on either axis. Without them,
   * `last.right - size.width` (LTR) / `first.right - size.width` (RTL) /
   * `last.bottom - size.height` go negative and pull the clamped
   * position outside the spine on the wrong side.
   *
   * Real layouts that hit this:
   *   - spread mode with a single (or short) book — the rectangle
   *     spans two pages, the spine spans one
   *   - any spine item shorter than the viewport on the y-axis
   */
  describe(`rect larger than spine`, () => {
    describe(`LTR`, () => {
      const { spineItemsManager, spine } = buildFixture({
        left: 0,
        right: 100,
        bottom: 50,
      })

      it(`floors xMax at 0 when size.width exceeds last.right`, () => {
        const result = clampRectInSpine({
          position: new SpinePosition({ x: 9999, y: 0 }),
          size: { width: 200, height: 30 },
          isRTL: false,
          spineItemsManager,
          spine,
        })

        expect(result).toEqual(new UnboundSpinePosition({ x: 0, y: 0 }))
      })

      it(`floors yMax at 0 when size.height exceeds last.bottom`, () => {
        const result = clampRectInSpine({
          position: new SpinePosition({ x: 0, y: 9999 }),
          size: { width: 50, height: 100 },
          isRTL: false,
          spineItemsManager,
          spine,
        })

        expect(result).toEqual(new UnboundSpinePosition({ x: 0, y: 0 }))
      })
    })

    describe(`RTL`, () => {
      const { spineItemsManager, spine } = buildFixture({
        left: -100,
        right: 50,
        bottom: 50,
      })

      it(`floors xMax at 0 when size.width exceeds first.right`, () => {
        const result = clampRectInSpine({
          position: new UnboundSpinePosition({ x: 9999, y: 0 }),
          size: { width: 200, height: 30 },
          isRTL: true,
          spineItemsManager,
          spine,
        })

        expect(result).toEqual(new UnboundSpinePosition({ x: 0, y: 0 }))
      })

      it(`floors yMax at 0 when size.height exceeds last.bottom`, () => {
        const result = clampRectInSpine({
          position: new UnboundSpinePosition({ x: 0, y: 9999 }),
          size: { width: 50, height: 100 },
          isRTL: true,
          spineItemsManager,
          spine,
        })

        expect(result).toEqual(new UnboundSpinePosition({ x: 0, y: 0 }))
      })
    })
  })
})

describe(`getBoundaryForRectInSpine`, () => {
  describe(`empty spine`, () => {
    // Cast: minimal spine items manager mock for boundary helper tests.
    const spineItemsManager = {
      get: () => undefined,
      items: { length: 0 },
    } as unknown as SpineItemsManager
    // Cast: minimal spine mock; layout lookup must not be reached here.
    const spine = {
      getSpineItemSpineLayoutInfo: () => {
        throw new Error(`should not be invoked when there are no spine items`)
      },
    } as unknown as Spine

    it(`returns undefined without consulting layout info`, () => {
      const result = getBoundaryForRectInSpine({
        position: new SpinePosition({ x: 9999, y: 9999 }),
        size: { width: 200, height: 100 },
        isRTL: false,
        spineItemsManager,
        spine,
      })

      expect(result).toBeUndefined()
    })
  })

  describe(`LTR`, () => {
    const { spineItemsManager, spine } = buildFixture({
      left: 0,
      right: 1000,
      bottom: 600,
    })

    it(`classifies positions before the lower edge as start`, () => {
      const result = getBoundaryForRectInSpine({
        position: new UnboundSpinePosition({ x: -1, y: 0 }),
        size: { width: 200, height: 100 },
        isRTL: false,
        spineItemsManager,
        spine,
      })

      expect(result).toBe("start")
    })

    it(`classifies positions after the upper edge as end`, () => {
      const result = getBoundaryForRectInSpine({
        position: new UnboundSpinePosition({ x: 801, y: 0 }),
        size: { width: 200, height: 100 },
        isRTL: false,
        spineItemsManager,
        spine,
      })

      expect(result).toBe("end")
    })

    it(`returns undefined for an in-bounds position`, () => {
      const result = getBoundaryForRectInSpine({
        position: new SpinePosition({ x: 800, y: 500 }),
        size: { width: 200, height: 100 },
        isRTL: false,
        spineItemsManager,
        spine,
      })

      expect(result).toBeUndefined()
    })
  })

  describe(`RTL`, () => {
    const { spineItemsManager, spine } = buildFixture({
      left: -1000,
      right: 200,
      bottom: 600,
    })

    it(`classifies positions after the right edge as start`, () => {
      const result = getBoundaryForRectInSpine({
        position: new UnboundSpinePosition({ x: 1, y: 0 }),
        size: { width: 200, height: 100 },
        isRTL: true,
        spineItemsManager,
        spine,
      })

      expect(result).toBe("start")
    })

    it(`classifies positions before the left edge as end`, () => {
      const result = getBoundaryForRectInSpine({
        position: new UnboundSpinePosition({ x: -1001, y: 0 }),
        size: { width: 200, height: 100 },
        isRTL: true,
        spineItemsManager,
        spine,
      })

      expect(result).toBe("end")
    })

    it(`returns undefined for an in-bounds position`, () => {
      const result = getBoundaryForRectInSpine({
        position: new SpinePosition({ x: 0, y: 500 }),
        size: { width: 200, height: 100 },
        isRTL: true,
        spineItemsManager,
        spine,
      })

      expect(result).toBeUndefined()
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
      })

      expect(result).toEqual(new UnboundSpinePosition({ x: 999, y: 599 }))
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
     * returned the viewport for the upper bound, which was inconsistent
     * with LTR's `right - 1` convention and let the point sit one pixel
     * outside the spine on the right edge.
     */
    it(`clamps x to first.right - 1 on the right edge`, () => {
      const result = clampRectInSpine({
        position: new UnboundSpinePosition({ x: 9999, y: 0 }),
        size: { width: 1, height: 1 },
        isRTL: true,
        spineItemsManager,
        spine,
      })

      expect(result).toEqual(new UnboundSpinePosition({ x: 199, y: 0 }))
    })
  })
})
