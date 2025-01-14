import { Streamer } from "@prose-reader/streamer"
import { getBlobFromKey } from "./utils.shared"
import * as pdfjsLib from "pdfjs-dist"
import { createArchiveFromPdf } from "@prose-reader/enhancer-pdf"

import pdfWorkerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url"

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  pdfWorkerUrl,
  import.meta.url,
).toString()

export const webStreamer = new Streamer({
  /**
   * Local streamer is usually used for non serializable resources
   * and therefore requires the archive to be long lived. It usually should
   * not be cleaned while the book is loaded.
   * eg: PDF.
   *
   * The streamer is pruned on book unload.
   */
  cleanArchiveAfter: Infinity,
  getArchive: async (key: string) => {
    const { blob, url, filename } = await getBlobFromKey(key)

    if (!url.endsWith(`.pdf`)) {
      throw new Error(`Please use sw streamer`)
    }

    return createArchiveFromPdf(blob, filename)
  },
})
