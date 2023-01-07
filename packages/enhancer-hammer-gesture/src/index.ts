import { Enhancer } from "@prose-reader/core"
import "hammerjs"

/**
 */
export const hammerGestureEnhancer: Enhancer<
  {
    // eslint-disable-next-line no-undef
    hammerManager?: HammerManager
  },
  {}
> =
  (next) =>
    ({ hammerManager, ...rest }) => {
      const reader = next(rest)

      const onPinchStart = () => {
        if (!reader?.zoom.isZooming()) {
          reader?.zoom.enter()
        }
      }

      // eslint-disable-next-line no-undef
      const onPinchEnd = (_: HammerInput) => {
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

      // eslint-disable-next-line no-undef
      const onPinch = (ev: HammerInput) => {
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
