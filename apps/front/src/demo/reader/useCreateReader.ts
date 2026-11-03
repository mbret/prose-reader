import { cbzEnhancer } from "@prose-reader/cbz"
import { createReader } from "@prose-reader/core"
import { annotationsEnhancer } from "@prose-reader/enhancer-annotations"
import { audioEnhancer } from "@prose-reader/enhancer-audio"
import { galleryEnhancer } from "@prose-reader/enhancer-gallery"
import { gesturesEnhancer } from "@prose-reader/enhancer-gestures"
import { pdfEnhancer } from "@prose-reader/enhancer-pdf"
import { refitEnhancer } from "@prose-reader/enhancer-refit"
import { searchEnhancer } from "@prose-reader/enhancer-search"
import {
  BOOKMARK_AREA_DATA_ATTRIBUTE,
  type ReactReaderSettings,
} from "@prose-reader/react-reader"
import type { Manifest } from "@prose-reader/shared"
import pdfjsViewerInlineCss from "pdfjs-dist/web/pdf_viewer.css?inline"
import { useMemo } from "react"
import { SIGNAL_RESET } from "reactjrx"
import { of } from "rxjs"
import { getFileKeyFromUrl } from "../streamer/utils.shared"
import { webStreamer } from "../streamer/webStreamer"
import { getReadingPositionKey } from "./usePersistReadingPosition"
import { readerSignal } from "./useReader"

export type ReaderInstance = ReturnType<typeof createAppReader>

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

/**
 * The factory ReactReader creates the book's reader with, once the manifest is
 * loaded.
 */
export const useCreateReader = (
  manifest: Manifest | undefined,
  bookKey: string,
) =>
  useMemo(() => {
    if (!manifest) return undefined

    return function createReaderForBook(settings: ReactReaderSettings) {
      const query = new URLSearchParams(window.location.search)
      const readingPosition = localStorage.getItem(
        getReadingPositionKey(bookKey),
      )

      const readerOptions: Parameters<typeof createAppReader>[0] = {
        manifest,
        ...settings,
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
          getArchiveForItem: (item) => {
            if (!item.href.endsWith(`pdf`)) {
              return of(undefined)
            }

            const key = getFileKeyFromUrl(item.href)

            return webStreamer.accessArchiveWithoutLock(key)
          },
        },
      }

      return createAppReader(readerOptions)
    }
  }, [manifest, bookKey])

/**
 * Shares the reader ReactReader created with the rest of the demo, and prunes
 * the streamer once ReactReader destroyed it.
 */
export const shareReaderWithDemo = (reader: ReaderInstance | undefined) => {
  if (reader) {
    readerSignal.update(reader)

    return
  }

  readerSignal.update(SIGNAL_RESET)
  webStreamer.prune()
}
