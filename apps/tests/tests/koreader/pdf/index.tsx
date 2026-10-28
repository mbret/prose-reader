import { createReader } from "@prose-reader/core"
import { koreaderEnhancer } from "@prose-reader/enhancer-koreader"
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
  const response = await fetch("http://localhost:3333/epubs/koreader-pages.pdf")
  const archive = await createArchiveFromPdf(
    await response.blob(),
    "koreader-pages.pdf",
  )
  const manifest = await generateManifestFromArchive(archive)

  const reader = koreaderEnhancer(pdfEnhancer(createReader))({
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

  // @ts-expect-error export for the spec
  window.reader = reader
}

run()
