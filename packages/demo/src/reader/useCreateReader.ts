import { useEffect } from "react"
import { readerSignal } from "./useReader"
import { SIGNAL_RESET } from "reactjrx"

import { bookmarksEnhancer } from "@prose-reader/enhancer-bookmarks"
import { searchEnhancer } from "@prose-reader/enhancer-search"
import { highlightsEnhancer } from "@prose-reader/enhancer-highlights"
import { gesturesEnhancer } from "@prose-reader/enhancer-gestures"
import { createReader } from "@prose-reader/core"

export type ReaderInstance = ReturnType<typeof createAppReader>

export const createAppReader = gesturesEnhancer(
  highlightsEnhancer(
    bookmarksEnhancer(
      searchEnhancer(
        // __
        createReader
      )
    )
  )
)

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
