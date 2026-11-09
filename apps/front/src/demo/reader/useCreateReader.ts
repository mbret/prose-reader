import { cbzEnhancer } from "@prose-reader/cbz"
import { createReader } from "@prose-reader/core"
import { annotationsEnhancer } from "@prose-reader/enhancer-annotations"
import { audioEnhancer } from "@prose-reader/enhancer-audio"
import { galleryEnhancer } from "@prose-reader/enhancer-gallery"
import { gesturesEnhancer } from "@prose-reader/enhancer-gestures"
import { pdfEnhancer } from "@prose-reader/enhancer-pdf"
import { refitEnhancer } from "@prose-reader/enhancer-refit"
import { searchEnhancer } from "@prose-reader/enhancer-search"
import { BOOKMARK_AREA_DATA_ATTRIBUTE } from "@prose-reader/react-reader"
import type { Manifest } from "@prose-reader/shared"
import pdfjsViewerInlineCss from "pdfjs-dist/web/pdf_viewer.css?inline"
import { useMemo } from "react"
import { webStreamer } from "../streamer/webStreamer"
import { getReadingPositionKey } from "./usePersistReadingPosition"

export type ReaderInstance = ReturnType<typeof createAppReader>

declare module "@prose-reader/react-reader" {
  interface Register {
    reader: ReaderInstance
  }
}

declare global {
  interface Window {
    reader?: ReaderInstance
  }
}

export const createAppReader = refitEnhancer(
  galleryEnhancer(
    pdfEnhancer(
      annotationsEnhancer(
        gesturesEnhancer(
          searchEnhancer(
            audioEnhancer(
              // __
              cbzEnhancer(createReader),
            ),
          ),
        ),
      ),
    ),
  ),
)

export const useCreateReader = (
  manifest: Manifest | undefined,
  bookKey: string,
) =>
  useMemo(() => {
    if (!manifest) return undefined

    return function createReaderForBook() {
      const query = new URLSearchParams(window.location.search)
      const readingPosition = localStorage.getItem(
        getReadingPositionKey(bookKey),
      )

      const readerOptions: Parameters<typeof createAppReader>[0] = {
        manifest,
        target: readingPosition
          ? { type: "cfi", value: readingPosition }
          : undefined,
        pageTurnAnimation: `slide`,
        pageTurnDirection: query.has("vertical") ? `vertical` : `horizontal`,
        pageTurnMode: query.has("free") ? `scrollable` : `controlled`,
        gestures: {
          ignore: [
            // ignore gestures within the bookmark area
            `[${BOOKMARK_AREA_DATA_ATTRIBUTE}]`,
          ],
        },
        pdf: {
          pdfjsViewerInlineCss,
          getArchiveForItem: () => webStreamer.accessArchive(bookKey),
        },
      }

      return createAppReader(readerOptions)
    }
  }, [manifest, bookKey])
