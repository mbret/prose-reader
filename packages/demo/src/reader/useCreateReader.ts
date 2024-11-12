import { useEffect } from "react"
import { readerSignal } from "./useReader"
import { SIGNAL_RESET } from "reactjrx"
import { bookmarksEnhancer } from "@prose-reader/enhancer-bookmarks"
import { searchEnhancer } from "@prose-reader/enhancer-search"
import { highlightsEnhancer } from "@prose-reader/enhancer-highlights"
import { gesturesEnhancer } from "@prose-reader/enhancer-gestures"
import { pdfEnhancer } from "@prose-reader/enhancer-pdf"
import { createReader } from "@prose-reader/core"
import { webStreamer } from "../streamer/webStreamer"
import { getFileKeyFromUrl } from "../streamer/utils.shared"
import { of } from "rxjs"

export type ReaderInstance = ReturnType<typeof createAppReader>

export const createAppReader = pdfEnhancer(
  gesturesEnhancer(
    highlightsEnhancer(
      bookmarksEnhancer(
        searchEnhancer(
          // __
          createReader
        )
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
      pageTurnDirection: query.has("vertical") ? `vertical` : `horizontal`,
      pageTurnMode: query.has("free") ? `scrollable` : `controlled`,
      gestures: {
        fontScalePinchEnabled: true
      },
      pdf: {
        getArchiveForItem: (item) => {
          if (!item.href.endsWith(`pdf`)) {
            return of(undefined)
          }

          const key = getFileKeyFromUrl(item.href)

          return webStreamer.accessArchiveWithoutLock(key)
        }
      }
    }

    const instance = createAppReader(readerOptions)

    readerSignal.setValue(instance)

    return () => {
      instance.destroy()

      readerSignal.setValue(SIGNAL_RESET)

      webStreamer.prune()
    }
  }, [])
}
