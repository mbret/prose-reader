import { useEffect } from "react"
import { MAX_ZOOM_SCALE } from "../constants"
import { useReader } from "../context/useReader"
import { useReaderContextValue } from "../context/useReaderContext"

export const useZoomSettings = () => {
  const reader = useReader()
  const { zoomMaxScale } = useReaderContextValue(["zoomMaxScale"])

  useEffect(
    function syncSettingsWithGesturesEnhancer() {
      reader?.gestures.settings.update({
        zoomMaxScale: zoomMaxScale ?? MAX_ZOOM_SCALE,
      })
    },
    [reader, zoomMaxScale],
  )
}
