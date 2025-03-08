import { createReader } from "@prose-reader/core"
import { createArchiveFromPdf, pdfEnhancer } from "@prose-reader/enhancer-pdf"
import { generateManifestFromArchive } from "@prose-reader/streamer"
import * as pdfjsLib from "pdfjs-dist"
import pdfWorkerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url"
import pdfjsViewerInlineCss from "pdfjs-dist/web/pdf_viewer.css?inline"
import { of } from "rxjs"

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  pdfWorkerUrl,
  import.meta.url,
).toString()

async function run() {
  const response = await fetch("http://localhost:3333/epubs/sample-3.pdf")
  const pdfBlob = await response.blob()
  const archive = await createArchiveFromPdf(pdfBlob, "sample.pdf")
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
    // biome-ignore lint/style/noNonNullAssertion: <explanation>
    containerElement: document.getElementById(`app`)!,
    manifest,
    cfi,
  })

  // @ts-expect-error export for debug
  window.reader = reader
}

run()
