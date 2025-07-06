import type { SpinePosition, UnboundSpinePosition } from "../spine/types"

/**
 * This correspond to a visible slice of the viewport
 * with its coordinate and size. This is not a navigable position
 * nor a spine position. It could be navigable and could be a valid
 * spine position but its intent is different and usually to deduce
 * visible elements on screen for example.
 *
 * This is mostly useful when the viewport is scaled up / down. If there was
 * no scale this would be the equivalent of spine position + viewport
 *
 * You can also see it as a superposition of a spine position and a viewport creating
 * a new position + its spanning size
 */
export class ViewportSlicePosition extends DOMRect {
  public readonly __symbol = Symbol(`ViewportPosition`)

  static from(rect: {
    x: number
    y: number
    width: number
    height: number
  }): ViewportSlicePosition

  static from(
    position: SpinePosition | UnboundSpinePosition,
    viewport: AbsoluteViewport | RelativeViewport,
  ): ViewportSlicePosition

  static from(
    positionOrRect:
      | SpinePosition
      | UnboundSpinePosition
      | { x: number; y: number; width: number; height: number },
    viewport?: AbsoluteViewport | RelativeViewport,
  ): ViewportSlicePosition {
    if (viewport) {
      // Second overload: position and viewport
      const position = positionOrRect as SpinePosition
      return new ViewportSlicePosition(
        position.x,
        position.y,
        viewport.width,
        viewport.height,
      )
    }
    // First overload: rect with x, y, width, height
    const rect = positionOrRect as {
      x: number
      y: number
      width: number
      height: number
    }
    return new ViewportSlicePosition(rect.x, rect.y, rect.width, rect.height)
  }
}

export class AbsoluteViewport {
  width: number
  height: number

  public readonly __symbol = Symbol(`AbsoluteViewport`)

  constructor({ width, height }: { width: number; height: number }) {
    this.width = width
    this.height = height
  }
}

export class RelativeViewport {
  width: number
  height: number

  public readonly __symbol = Symbol(`RelativeViewport`)

  constructor({ width, height }: { width: number; height: number }) {
    this.width = width
    this.height = height
  }
}
