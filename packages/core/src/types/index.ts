/// <reference types="vite/client" />
import type { Manifest } from "@prose-reader/shared"

export type { Manifest }

export abstract class AbstractPosition {
  public readonly x: number
  public readonly y: number

  constructor(position: { x: number; y: number }) {
    this.x = position.x
    this.y = position.y
  }
}
