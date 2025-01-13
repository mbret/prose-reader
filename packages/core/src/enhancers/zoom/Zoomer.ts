import type { BehaviorSubject } from "rxjs"
import type { Reader } from "../../reader"

export abstract class Zoomer {
  constructor(protected reader: Reader) {}

  public abstract enter(element?: HTMLImageElement): void
  public abstract exit(): void
  public abstract moveAt(position: { x: number; y: number }): void
  public abstract scaleAt(scale: number): void

  public abstract element: HTMLDivElement | undefined
  public abstract isZooming$: BehaviorSubject<boolean>
  public abstract currentScale: number
  public abstract currentPosition: { x: number; y: number }
}
