import { describe, expect, it } from "vitest"
import type { Spine } from "../../spine/Spine"
import {
  SpineBoundingBox,
  SpinePosition,
  UnboundSpinePosition,
} from "../../spine/types"
import { clampRectInSpine, getBoundaryForRectInSpine } from "./clampRectInSpine"

/** A spine whose items fill a box of these edges: the box the clamp reads. */
const buildSpine = ({
  left = 0,
  right = 0,
  top = 0,
  bottom = 0,
}: Partial<Pick<SpineBoundingBox, "left" | "right" | "top" | "bottom">>) => {
  // Cast: minimal spine mock, which only gives the box of its items.
  return {
    boundingBox: new SpineBoundingBox({
      left,
      right,
      top,
      bottom,
      width: right - left,
      height: bottom - top,
      x: left,
      y: top,
    }),
  } as unknown as Spine
}

describe(`clampRectInSpine`, () => {
  describe(`spine with no item laid out`, () => {
    // Cast: minimal spine mock, which has no box yet.
    const spine = { boundingBox: undefined } as unknown as Spine

    it(`returns the origin`, () => {
      const result = clampRectInSpine({
        position: new SpinePosition({ x: 9999, y: 9999 }),
        size: { width: 200, height: 100 },
        isRTL: false,
        spine,
      })

      expect(result).toEqual(new UnboundSpinePosition({ x: 0, y: 0 }))
    })
  })

  describe(`LTR`, () => {
    const spine = buildSpine({
      left: 0,
      right: 1000,
      bottom: 600,
    })

    it(`clamps positive x to right - size.width and y to bottom - size.height`, () => {
      const result = clampRectInSpine({
        position: new SpinePosition({ x: 9999, y: 9999 }),
        size: { width: 200, height: 100 },
        isRTL: false,
        spine,
      })

      expect(result).toEqual(new UnboundSpinePosition({ x: 800, y: 500 }))
    })

    it(`clamps negative x and y to 0`, () => {
      const result = clampRectInSpine({
        position: new UnboundSpinePosition({ x: -50, y: -50 }),
        size: { width: 200, height: 100 },
        isRTL: false,
        spine,
      })

      expect(result).toEqual(new UnboundSpinePosition({ x: 0, y: 0 }))
    })

    it(`leaves an in-bounds position untouched`, () => {
      const result = clampRectInSpine({
        position: new SpinePosition({ x: 250, y: 100 }),
        size: { width: 200, height: 100 },
        isRTL: false,
        spine,
      })

      expect(result).toEqual(new UnboundSpinePosition({ x: 250, y: 100 }))
    })
  })

  describe(`RTL`, () => {
    const spine = buildSpine({
      left: -1000,
      right: 200,
      bottom: 600,
    })

    it(`clamps x to right - size.width on the right edge`, () => {
      const result = clampRectInSpine({
        position: new UnboundSpinePosition({ x: 9999, y: 0 }),
        size: { width: 200, height: 100 },
        isRTL: true,
        spine,
      })

      expect(result).toEqual(new UnboundSpinePosition({ x: 0, y: 0 }))
    })

    it(`clamps x to left on the left edge`, () => {
      const result = clampRectInSpine({
        position: new UnboundSpinePosition({ x: -9999, y: 0 }),
        size: { width: 200, height: 100 },
        isRTL: true,
        spine,
      })

      expect(result).toEqual(new UnboundSpinePosition({ x: -1000, y: 0 }))
    })

    it(`clamps y to bottom - size.height`, () => {
      const result = clampRectInSpine({
        position: new UnboundSpinePosition({ x: -100, y: 9999 }),
        size: { width: 200, height: 100 },
        isRTL: true,
        spine,
      })

      expect(result).toEqual(new UnboundSpinePosition({ x: -100, y: 500 }))
    })
  })

  /**
   * The `Math.max(0, …)` floors guarantee the function honours its
   * contract ("position … inside the spine") even when the rectangle is
   * larger than the spine on either axis. Without them,
   * `right - size.width` and `bottom - size.height` go negative and pull
   * the clamped position outside the spine on the wrong side.
   *
   * Real layouts that hit this:
   *   - spread mode with a single (or short) book — the rectangle
   *     spans two pages, the spine spans one
   *   - any spine item shorter than the viewport on the y-axis
   */
  describe(`rect larger than spine`, () => {
    describe(`LTR`, () => {
      const spine = buildSpine({
        left: 0,
        right: 100,
        bottom: 50,
      })

      it(`floors xMax at 0 when size.width exceeds right`, () => {
        const result = clampRectInSpine({
          position: new SpinePosition({ x: 9999, y: 0 }),
          size: { width: 200, height: 30 },
          isRTL: false,
          spine,
        })

        expect(result).toEqual(new UnboundSpinePosition({ x: 0, y: 0 }))
      })

      it(`floors yMax at 0 when size.height exceeds bottom`, () => {
        const result = clampRectInSpine({
          position: new SpinePosition({ x: 0, y: 9999 }),
          size: { width: 50, height: 100 },
          isRTL: false,
          spine,
        })

        expect(result).toEqual(new UnboundSpinePosition({ x: 0, y: 0 }))
      })
    })

    describe(`RTL`, () => {
      const spine = buildSpine({
        left: -100,
        right: 50,
        bottom: 50,
      })

      it(`floors xMax at 0 when size.width exceeds right`, () => {
        const result = clampRectInSpine({
          position: new UnboundSpinePosition({ x: 9999, y: 0 }),
          size: { width: 200, height: 30 },
          isRTL: true,
          spine,
        })

        expect(result).toEqual(new UnboundSpinePosition({ x: 0, y: 0 }))
      })

      it(`floors yMax at 0 when size.height exceeds bottom`, () => {
        const result = clampRectInSpine({
          position: new UnboundSpinePosition({ x: 0, y: 9999 }),
          size: { width: 50, height: 100 },
          isRTL: true,
          spine,
        })

        expect(result).toEqual(new UnboundSpinePosition({ x: 0, y: 0 }))
      })
    })
  })
})

describe(`getBoundaryForRectInSpine`, () => {
  describe(`spine with no item laid out`, () => {
    // Cast: minimal spine mock, which has no box yet.
    const spine = { boundingBox: undefined } as unknown as Spine

    it(`returns undefined`, () => {
      const result = getBoundaryForRectInSpine({
        position: new SpinePosition({ x: 9999, y: 9999 }),
        size: { width: 200, height: 100 },
        isRTL: false,
        spine,
      })

      expect(result).toBeUndefined()
    })
  })

  describe(`LTR`, () => {
    const spine = buildSpine({
      left: 0,
      right: 1000,
      bottom: 600,
    })

    it(`classifies positions before the lower edge as start`, () => {
      const result = getBoundaryForRectInSpine({
        position: new UnboundSpinePosition({ x: -1, y: 0 }),
        size: { width: 200, height: 100 },
        isRTL: false,
        spine,
      })

      expect(result).toBe("start")
    })

    it(`classifies positions after the upper edge as end`, () => {
      const result = getBoundaryForRectInSpine({
        position: new UnboundSpinePosition({ x: 801, y: 0 }),
        size: { width: 200, height: 100 },
        isRTL: false,
        spine,
      })

      expect(result).toBe("end")
    })

    it(`returns undefined for an in-bounds position`, () => {
      const result = getBoundaryForRectInSpine({
        position: new SpinePosition({ x: 800, y: 500 }),
        size: { width: 200, height: 100 },
        isRTL: false,
        spine,
      })

      expect(result).toBeUndefined()
    })
  })

  describe(`RTL`, () => {
    const spine = buildSpine({
      left: -1000,
      right: 200,
      bottom: 600,
    })

    it(`classifies positions after the right edge as start`, () => {
      const result = getBoundaryForRectInSpine({
        position: new UnboundSpinePosition({ x: 1, y: 0 }),
        size: { width: 200, height: 100 },
        isRTL: true,
        spine,
      })

      expect(result).toBe("start")
    })

    it(`classifies positions before the left edge as end`, () => {
      const result = getBoundaryForRectInSpine({
        position: new UnboundSpinePosition({ x: -1001, y: 0 }),
        size: { width: 200, height: 100 },
        isRTL: true,
        spine,
      })

      expect(result).toBe("end")
    })

    it(`returns undefined for an in-bounds position`, () => {
      const result = getBoundaryForRectInSpine({
        position: new SpinePosition({ x: 0, y: 500 }),
        size: { width: 200, height: 100 },
        isRTL: true,
        spine,
      })

      expect(result).toBeUndefined()
    })
  })
})

describe(`clampRectInSpine with size 1×1 (point clamp)`, () => {
  describe(`LTR`, () => {
    const spine = buildSpine({
      left: 0,
      right: 1000,
      bottom: 600,
    })

    it(`clamps to right - 1 and bottom - 1 on the upper edge`, () => {
      const result = clampRectInSpine({
        position: new SpinePosition({ x: 9999, y: 9999 }),
        size: { width: 1, height: 1 },
        isRTL: false,
        spine,
      })

      expect(result).toEqual(new UnboundSpinePosition({ x: 999, y: 599 }))
    })
  })

  describe(`RTL`, () => {
    const spine = buildSpine({
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
    it(`clamps x to right - 1 on the right edge`, () => {
      const result = clampRectInSpine({
        position: new UnboundSpinePosition({ x: 9999, y: 0 }),
        size: { width: 1, height: 1 },
        isRTL: true,
        spine,
      })

      expect(result).toEqual(new UnboundSpinePosition({ x: 199, y: 0 }))
    })
  })
})
