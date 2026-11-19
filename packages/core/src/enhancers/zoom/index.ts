import type { Reader } from "../../reader.ts"
import type { ZoomEnhancerOutput } from "./types.ts"
import { ZoomController } from "./ZoomController.ts"

export const zoomEnhancer =
  <InheritOptions, InheritOutput extends Reader>(
    next: (options: InheritOptions) => InheritOutput,
  ) =>
  (options: InheritOptions): InheritOutput & ZoomEnhancerOutput => {
    const reader = next(options)
    const zoomController = new ZoomController(reader)

    const destroy = () => {
      zoomController.destroy()
      reader.destroy()
    }

    const state$ = zoomController

    return {
      ...reader,
      destroy,
      zoom: {
        enter: zoomController.enter.bind(zoomController),
        scaleAt: zoomController.scaleAt.bind(zoomController),
        move: zoomController.move.bind(zoomController),
        exit: zoomController.exit.bind(zoomController),
        state$,
        get state() {
          return zoomController.value
        },
      },
    }
  }
