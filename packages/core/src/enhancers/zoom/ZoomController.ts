import type { Reader } from "../../reader"
import { ReactiveEntity } from "../../utils/ReactiveEntity"

export type ZoomControllerState = {
  element: HTMLDivElement | undefined
  isZooming: boolean
  currentScale: number
  currentPosition: { x: number; y: number }
}

export abstract class ZoomController extends ReactiveEntity<ZoomControllerState> {
  constructor(protected reader: Reader) {
    super({
      element: undefined,
      isZooming: false,
      currentScale: 1,
      currentPosition: { x: 0, y: 0 },
    })
  }

  public abstract enter(params?: {
    element?: HTMLImageElement
    scale?: number
    animate?: boolean
  }): void
  public abstract exit(): void
  public abstract moveAt(position: { x: number; y: number }): void
  public abstract scaleAt(scale: number): void
}
