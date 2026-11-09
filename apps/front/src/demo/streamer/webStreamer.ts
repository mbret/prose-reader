import { streamerHooks } from "@prose-reader/cbz"
import { createArchiveFromPdf } from "@prose-reader/enhancer-pdf"
import { Streamer } from "@prose-reader/streamer"
import * as pdfjsLib from "pdfjs-dist"
import pdfWorkerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url"
import { getBlobFromKey } from "./utils.shared"

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  pdfWorkerUrl,
  import.meta.url,
).toString()

export const webStreamer = new Streamer({
  hooks: {
    manifest: streamerHooks.manifest,
    resource: streamerHooks.resource,
  },
  getArchive: async (key: string) => {
    const { blob, url, filename } = await getBlobFromKey(key)

    if (!url.endsWith(`.pdf`)) {
      throw new Error(`Please use sw streamer`)
    }

    return createArchiveFromPdf(blob, filename)
  },
})
