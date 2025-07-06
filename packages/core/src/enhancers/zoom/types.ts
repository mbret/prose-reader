import type { Observable } from "rxjs"
import type { ZoomControllerState } from "./ZoomController"

export type ZoomEnhancerOutput = {
  zoom: {
    enter: (imgElement?: HTMLImageElement) => void
    exit: () => void
    moveAt: (position: { x: number; y: number }) => void
    scaleAt: (scale: number) => void
    state$: Observable<ZoomControllerState>
    get state(): ZoomControllerState
  }
}
