import type { Observable } from "rxjs"
import type { ZoomControllerState } from "./ZoomController"

export type ZoomPosition = { x: number; y: number }

export type ZoomEnhancerOutput = {
  zoom: {
    enter: (params?: {
      element?: HTMLImageElement
      scale?: number
      animate?: boolean
    }) => void
    exit: (options?: { animate?: boolean }) => void
    move: (
      position: ZoomPosition,
      options?: { constrain?: "within-viewport" },
    ) => void
    scaleAt: (
      scale: number,
      options?: { constrain?: "within-viewport" },
    ) => void
    state$: Observable<ZoomControllerState>
    get state(): ZoomControllerState
  }
}
