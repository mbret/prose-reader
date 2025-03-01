export class SpineItemPosition {
  public readonly x: number
  public readonly y: number
  public readonly __symbol = Symbol(`SpineItemPosition`)

  constructor(position: { x: number; y: number }) {
    this.x = position.x
    this.y = position.y
  }
}
