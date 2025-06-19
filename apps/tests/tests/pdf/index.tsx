import { createReader } from "@prose-reader/core"
import { gesturesEnhancer } from "@prose-reader/enhancer-gestures"
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

  const createReaderWithEnhancers = gesturesEnhancer(pdfEnhancer(createReader))

  const reader = createReaderWithEnhancers({
    pageTurnAnimation: "none",
    layoutLayerTransition: false,
    pdf: {
      pdfjsViewerInlineCss,
      getArchiveForItem: () => {
        return of(archive)
      },
    },
  })

  reader.load({
    // biome-ignore lint/style/noNonNullAssertion: TODO
    containerElement: document.getElementById(`app`)!,
    manifest,
  })

  // @ts-expect-error export for debug
  window.reader = reader
}

run()
