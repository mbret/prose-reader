import type { Observable } from "rxjs"
import type { ZoomControllerState } from "./ZoomController"

export type ZoomEnhancerOutput = {
  zoom: {
    enter: (params?: {
      element?: HTMLImageElement
      scale?: number
      animate?: boolean
    }) => void
    exit: (options?: { animate?: boolean }) => void
    move: (position: { x: number; y: number }) => void
    scaleAt: (scale: number) => void
    state$: Observable<ZoomControllerState>
    get state(): ZoomControllerState
  }
}
