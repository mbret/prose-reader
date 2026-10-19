import { createReader } from "@prose-reader/core"
import { gesturesEnhancer } from "@prose-reader/enhancer-gestures"
import { createArchiveFromPdf, pdfEnhancer } from "@prose-reader/enhancer-pdf"
import { generateManifestFromArchive } from "@prose-reader/streamer"
import * as pdfjsLib from "pdfjs-dist"
import pdfWorkerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url"
import pdfjsViewerInlineCss from "pdfjs-dist/web/pdf_viewer.css?inline"
import { lastValueFrom, of } from "rxjs"

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  pdfWorkerUrl,
  import.meta.url,
).toString()

async function run() {
  // `?file=` opens another fixture than the default one
  const file =
    new URLSearchParams(window.location.search).get("file") ?? "sample-3.pdf"
  const response = await fetch(`http://localhost:3333/epubs/${file}`)
  const pdfBlob = await response.blob()
  const archive = await createArchiveFromPdf(pdfBlob, file)
  const manifest = await generateManifestFromArchive(archive)

  const createReaderWithEnhancers = gesturesEnhancer(pdfEnhancer(createReader))

  const reader = createReaderWithEnhancers({
    manifest,
    pageTurnAnimation: "none",
    layoutLayerTransition: false,
    pdf: {
      pdfjsViewerInlineCss,
      getArchiveForItem: () => {
        return of(archive)
      },
    },
  })

  // biome-ignore lint/style/noNonNullAssertion: TODO
  reader.mount(document.getElementById(`app`)!)

  // @ts-expect-error export for debug
  window.reader = reader
  // @ts-expect-error export for debug
  window.lastValueFrom = lastValueFrom
}

run()
