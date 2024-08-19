import { useEffect } from "react"
import { createAppReader } from "../types"
import { readerSignal } from "./useReader"
import { SIGNAL_RESET } from "reactjrx"

export const useCreateReader = () => {
  useEffect(() => {
    const query = new URLSearchParams(window.location.search)

    const readerOptions: Parameters<typeof createAppReader>[0] = {
      pageTurnAnimation: `slide`,
      layoutAutoResize: `container`,
      numberOfAdjacentSpineItemToPreLoad: 0,
      pageTurnDirection: query.has("vertical") ? `vertical` : `horizontal`,
      pageTurnMode: query.has("free") ? `scrollable` : `controlled`,
      gestures: {
        fontScalePinchEnabled: true
      },
      navigationSnapThreshold: 0.2
    }

    const instance = createAppReader(readerOptions)

    readerSignal.setValue(instance)

    return () => {
      instance.destroy()

      readerSignal.setValue(SIGNAL_RESET)
    }
  }, [])
}
