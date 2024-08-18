import { useState } from "react"
import { ReactReaderProps } from "../../types"

export const useReaderOptions = () => {
  const query = new URLSearchParams(window.location.search)

  const [readerOptions] = useState<ReactReaderProps["options"] | undefined>({
    // fontScale: parseFloat(localStorage.getItem(`fontScale`) || `1`),
    // lineHeight: parseFloat(localStorage.getItem(`lineHeight`) || ``) || undefined,
    // theme: undefined,
    pageTurnAnimation: `slide`,
    layoutAutoResize: `container`,
    numberOfAdjacentSpineItemToPreLoad: 0,
    pageTurnDirection: query.has("vertical") ? `vertical` : `horizontal`,
    pageTurnMode: query.has("free") ? `scrollable` : `controlled`,
    gestures: {
      // panNavigation: "swipe"
      fontScalePinchEnabled: true
    },
    navigationSnapThreshold: 0.2
    // hammerGesture: {
    //   enableFontScalePinch: true,
    //   fontScaleMax: FONT_SCALE_MAX,
    //   fontScaleMin: FONT_SCALE_MIN
    // }
  })

  return { readerOptions }
}
