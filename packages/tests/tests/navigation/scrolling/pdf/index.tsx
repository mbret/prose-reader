import { createReader } from "@prose-reader/core"
import { generateManifestFromArchive } from "@prose-reader/streamer"
import { createArchiveFromPdf, pdfEnhancer } from "@prose-reader/enhancer-pdf"
import * as pdfjsLib from "pdfjs-dist"
import pdfWorkerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url"
import { of } from "rxjs"
import pdfjsViewerInlineCss from "pdfjs-dist/web/pdf_viewer.css?inline"

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(pdfWorkerUrl, import.meta.url).toString()

async function run() {
  const response = await fetch("http://localhost:3333/epubs/sample-3.pdf")
  const pdfBlob = await response.blob()
  const archive = await createArchiveFromPdf(pdfBlob)
  const manifest = await generateManifestFromArchive(archive)

  const createReaderWithEnhancers = pdfEnhancer(createReader)

  const reader = createReaderWithEnhancers({
    pageTurnAnimation: "none",
    pageTurnMode: "scrollable",
    layoutLayerTransition: false,
    pdf: {
      pdfjsViewerInlineCss,
      getArchiveForItem: () => {
        return of(archive)
      },
    },
  })

  const query = new URLSearchParams(window.location.search)
  const cfi = query.get("cfi") || undefined

  reader.load({
    containerElement: document.getElementById(`app`)!,
    manifest,
    cfi,
  })

  // @ts-expect-error export for debug
  window.reader = reader
}

run()
