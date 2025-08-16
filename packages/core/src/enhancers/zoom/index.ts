import { BehaviorSubject, of, switchMap } from "rxjs"
import { HTML_STYLE_PREFIX } from "../../constants"
import type { Reader } from "../../reader"
import { injectCSS, removeCSS } from "../../utils/dom"
import { ControlledZoomController } from "./ControlledZoomController"
import styles from "./index.scss?inline"
import { ScrollableZoomController } from "./ScrollableZoomer"
import type { ZoomEnhancerOutput } from "./types"
import type { ZoomController, ZoomControllerState } from "./ZoomController"

const STYLES_ID = `${HTML_STYLE_PREFIX}-enhancer-zoom`

export const zoomEnhancer =
  <InheritOptions, InheritOutput extends Reader>(
    next: (options: InheritOptions) => InheritOutput,
  ) =>
  (options: InheritOptions): InheritOutput & ZoomEnhancerOutput => {
    const reader = next(options)
    const defaultState: ZoomControllerState = {
      currentPosition: { x: 0, y: 0 },
      currentScale: 1,
      element: undefined,
      isZooming: false,
    }
    const controllableZoomer = new ControlledZoomController(reader)
    const scrollableZoomer = new ScrollableZoomController(reader)
    const zoomSubject = new BehaviorSubject<ZoomController | undefined>(
      undefined,
    )

    injectCSS(document, STYLES_ID, styles)

    const enter: ZoomController["enter"] = (params) => {
      const zoomer =
        reader.settings.values.computedPageTurnMode === `scrollable`
          ? scrollableZoomer
          : controllableZoomer

      zoomSubject.next(zoomer)
      zoomer.enter(params)
    }

    const destroy = () => {
      removeCSS(document, STYLES_ID)

      controllableZoomer.exit()
      scrollableZoomer.exit()
      zoomSubject.complete()
      reader.destroy()
    }

    const state$ = zoomSubject.pipe(
      switchMap((zoomer) => zoomer ?? of(defaultState)),
    )

    return {
      ...reader,
      destroy,
      zoom: {
        enter,
        scaleAt: (scale) => zoomSubject.getValue()?.scaleAt(scale),
        moveAt: (position) => zoomSubject.getValue()?.moveAt(position),
        exit: () => {
          zoomSubject?.getValue()?.exit()
          zoomSubject.next(undefined)
        },
        state$,
        get state() {
          return zoomSubject.getValue()?.value ?? defaultState
        },
      },
    }
  }
