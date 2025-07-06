export class LayoutEntry {
  public readonly left: number
  public readonly right: number
  public readonly top: number
  public readonly bottom: number
  public readonly width: number
  public readonly height: number
  public readonly x: number
  public readonly y: number

  constructor(layout: {
    left: number
    right: number
    top: number
    bottom: number
    width: number
    height: number
    x: number
    y: number
  }) {
    this.left = layout.left
    this.right = layout.right
    this.top = layout.top
    this.bottom = layout.bottom
    this.width = layout.width
    this.height = layout.height
    this.x = layout.x
    this.y = layout.y
  }
}

export class SpineItemPosition {
  public readonly x: number
  public readonly y: number
  public readonly __symbol = Symbol(`SpineItemPosition`)

  constructor(position: { x: number; y: number }) {
    this.x = position.x
    this.y = position.y
  }
}

/**
 * Allow out of bounds positions
 */
export class UnboundSpineItemPagePosition {
  public readonly x: number
  public readonly y: number
  public readonly __symbol = Symbol(`SpineItemPagePosition`)

  constructor(position: { x: number; y: number }) {
    this.x = position.x
    this.y = position.y
  }
}

export class SpineItemPageLayout extends LayoutEntry {
  public readonly __symbol = `SpineItemPageLayout`
}
