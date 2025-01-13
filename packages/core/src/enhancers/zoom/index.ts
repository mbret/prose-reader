import { BehaviorSubject, switchMap } from "rxjs"
import type { Reader } from "../../reader"
import { ControllableZoomer } from "./ControllableZoomer"
import type { EnhancerApi } from "./types"
import { ScrollableZoomer } from "./ScrollableZoomer"
import type { Zoomer } from "./Zoomer"

export const zoomEnhancer =
  <InheritOptions, InheritOutput extends Reader>(
    next: (options: InheritOptions) => InheritOutput,
  ) =>
  (options: InheritOptions): InheritOutput & EnhancerApi => {
    const reader = next(options)
    const controllableZoomer = new ControllableZoomer(reader)
    const scrollableZoomer = new ScrollableZoomer(reader)
    const zoomerSubject = new BehaviorSubject<Zoomer>(scrollableZoomer)

    const enter: Zoomer["enter"] = (element) => {
      const zoomer =
        reader.settings.values.computedPageTurnMode === `scrollable`
          ? scrollableZoomer
          : controllableZoomer

      zoomerSubject.next(zoomer)
      zoomer.enter(element)
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
        get currentPosition() {
          return zoomerSubject.getValue().currentPosition
        },
        get currentScale() {
          return zoomerSubject.getValue().currentScale
        },
        isZooming$: zoomerSubject.pipe(
          switchMap((zoomer) => zoomer.isZooming$),
        ),
        get zoomContainerElement() {
          return zoomerSubject.getValue().element
        },
        get isZooming() {
          return zoomerSubject.getValue().isZooming$.getValue()
        },
      },
    }
  }
