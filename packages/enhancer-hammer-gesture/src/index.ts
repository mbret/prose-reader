import { Enhancer } from "@prose-reader/core"
import HammerStatic from "hammerjs"

class HammerManager extends HammerStatic.Manager { }

/**
 */
export const hammerGestureEnhancer: Enhancer<{
  hammerManager?: HammerManager
}, {}> = (next) => ({ hammerManager, ...rest }) => {
  const reader = next(rest)

  const onPinchStart = () => {
    if (!reader?.zoom.isZooming()) {
      reader?.zoom.enter()
    }
  }

  const onPinchEnd = (ev: HammerStatic[`Input`]) => {
    if (reader?.zoom.isZooming()) {
      reader?.zoom.setCurrentScaleAsBase()
      if (
        reader?.zoom.isUsingScrollableZoom() &&
        reader?.zoom.getScaleValue() <= 1
      ) {
        reader?.zoom.exit()
      }
    }
  }

  const onPinch = (ev: HammerStatic[`Input`]) => {
    if (reader?.zoom.isZooming()) {
      reader?.zoom.scale(ev.scale)
    }
  }

  hammerManager?.on(`pinch`, onPinch)
  hammerManager?.on(`pinchstart`, onPinchStart)
  hammerManager?.on(`pinchend`, onPinchEnd)

  const destroy = () => {
    hammerManager?.off(`pinchstart`, onPinchStart)
    hammerManager?.off(`pinchend`, onPinchEnd)
    hammerManager?.off(`pinch`, onPinch)
    reader.destroy()
  }

  return {
    ...reader,
    destroy
  }
}
