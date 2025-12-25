import { createReader } from "@prose-reader/core"
import { annotationsEnhancer } from "@prose-reader/enhancer-annotations"
import { galleryEnhancer } from "@prose-reader/enhancer-gallery"
import { gesturesEnhancer } from "@prose-reader/enhancer-gestures"
import { pdfEnhancer } from "@prose-reader/enhancer-pdf"
import { refitEnhancer } from "@prose-reader/enhancer-refit"
import { searchEnhancer } from "@prose-reader/enhancer-search"
import { BOOKMARK_AREA_DATA_ATTRIBUTE } from "@prose-reader/react-reader"
import pdfjsViewerInlineCss from "pdfjs-dist/web/pdf_viewer.css?inline"
import { useEffect } from "react"
import { SIGNAL_RESET } from "reactjrx"
import { of } from "rxjs"
import { getFileKeyFromUrl } from "../streamer/utils.shared"
import { webStreamer } from "../streamer/webStreamer"
import { readerSignal } from "./useReader"

export type ReaderInstance = ReturnType<typeof createAppReader>

export const createAppReader = refitEnhancer(
  galleryEnhancer(
    pdfEnhancer(
      annotationsEnhancer(
        gesturesEnhancer(
          searchEnhancer(
            // __
            createReader,
          ),
        ),
      ),
    ),
  ),
)

export const useCreateReader = () => {
  useEffect(() => {
    const query = new URLSearchParams(window.location.search)

    const readerOptions: Parameters<typeof createAppReader>[0] = {
      pageTurnAnimation: `slide`,
      pageTurnDirection: query.has("vertical") ? `vertical` : `horizontal`,
      pageTurnMode: query.has("free") ? `scrollable` : `controlled`,
      gestures: {
        fontScalePinchEnabled: true,
        ignore: [
          // ignore gestures within the bookmark area
          `[${BOOKMARK_AREA_DATA_ATTRIBUTE}]`,
        ],
      },
      pdf: {
        pdfjsViewerInlineCss,
        getArchiveForItem: (item) => {
          if (!item.href.endsWith(`pdf`)) {
            return of(undefined)
          }

          const key = getFileKeyFromUrl(item.href)

          return webStreamer.accessArchiveWithoutLock(key)
        },
      },
    }

    const instance = createAppReader(readerOptions)

    readerSignal.update(instance)

    return () => {
      instance.destroy()

      readerSignal.update(SIGNAL_RESET)

      webStreamer.prune()
    }
  }, [])
}
