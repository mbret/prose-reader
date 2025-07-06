import { BehaviorSubject, switchMap } from "rxjs"
import type { Reader } from "../../reader"
import { ControlledZoomController } from "./ControlledZoomController"
import { ScrollableZoomController } from "./ScrollableZoomer"
import type { ZoomEnhancerOutput } from "./types"
import type { ZoomController } from "./ZoomController"

export const zoomEnhancer =
  <InheritOptions, InheritOutput extends Reader>(
    next: (options: InheritOptions) => InheritOutput,
  ) =>
  (options: InheritOptions): InheritOutput & ZoomEnhancerOutput => {
    const reader = next(options)
    const controllableZoomer = new ControlledZoomController(reader)
    const scrollableZoomer = new ScrollableZoomController(reader)
    const zoomerSubject = new BehaviorSubject<ZoomController>(scrollableZoomer)

    const enter: ZoomController["enter"] = (params) => {
      const zoomer =
        reader.settings.values.computedPageTurnMode === `scrollable`
          ? scrollableZoomer
          : controllableZoomer

      zoomerSubject.next(zoomer)
      zoomer.enter(params)
    }

    const destroy = () => {
      controllableZoomer.exit()
      scrollableZoomer.exit()
      zoomerSubject.complete()
      reader.destroy()
    }

    return {
      ...reader,
      destroy,
      zoom: {
        enter,
        scaleAt: (scale) => zoomerSubject.getValue().scaleAt(scale),
        moveAt: (position) => zoomerSubject.getValue().moveAt(position),
        exit: () => zoomerSubject.getValue().exit(),
        state$: zoomerSubject.pipe(switchMap((zoomer) => zoomer)),
        get state() {
          return zoomerSubject.getValue().value
        },
      },
    }
  }
