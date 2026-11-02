import type { Observable } from "rxjs"
import type { ZoomController, ZoomControllerState } from "./ZoomController"

export type ZoomPosition = { x: number; y: number }

export type ZoomEnhancerOutput = {
  zoom: {
    enter: ZoomController["enter"]
    exit: ZoomController["exit"]
    move: ZoomController["move"]
    scaleAt: ZoomController["scaleAt"]
    state$: Observable<ZoomControllerState>
    get state(): ZoomControllerState
  }
}
