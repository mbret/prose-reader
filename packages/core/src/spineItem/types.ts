/**
 * Represent a position coordinate relative to an item (not the global viewport).
 * Not to be confused with SpinePosition.
 */
export type SpineItemPosition = {
  x: number
  y: number
  __symbol?: `SpineItemPosition`
}

export type UnsafeSpineItemPosition = {
  x: number
  y: number
  __symbol?: `UnsafeSpineItemPosition` | `SpineItemPosition`
}

export class SpineItemNavigationPosition {
  __symbol = `SpineItemNavigationPosition`
  public x: number
  public y: number
  constructor(position: { x: number; y: number }) {
    this.x = position.x
    this.y = position.y
  }
}
