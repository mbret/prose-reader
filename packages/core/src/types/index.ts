/// <reference types="vite/client" />

export abstract class AbstractPosition {
  public readonly x: number
  public readonly y: number

  constructor(position: { x: number; y: number }) {
    this.x = position.x
    this.y = position.y
  }
}
