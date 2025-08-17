import { HTML_STYLE_PREFIX } from "../../constants"
import type { Reader } from "../../reader"
import { injectCSS, removeCSS } from "../../utils/dom"
import styles from "./index.scss?inline"
import type { ZoomEnhancerOutput } from "./types"
import { ZoomController } from "./ZoomController"

const STYLES_ID = `${HTML_STYLE_PREFIX}-enhancer-zoom`

export const zoomEnhancer =
  <InheritOptions, InheritOutput extends Reader>(
    next: (options: InheritOptions) => InheritOutput,
  ) =>
  (options: InheritOptions): InheritOutput & ZoomEnhancerOutput => {
    const reader = next(options)
    const zoomController = new ZoomController(reader)

    injectCSS(document, STYLES_ID, styles)

    const destroy = () => {
      removeCSS(document, STYLES_ID)

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
