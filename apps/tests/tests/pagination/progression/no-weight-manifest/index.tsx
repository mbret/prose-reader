import { type Manifest, createReader } from "@prose-reader/core"
import * as pdfjsLib from "pdfjs-dist"
import pdfWorkerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url"
import { createRoot } from "react-dom/client"
import { useObserve } from "reactjrx"
import { of } from "rxjs"

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  pdfWorkerUrl,
  import.meta.url,
).toString()

async function run() {
  const manifest: Manifest = {
    filename: "sample",
    title: "sample",
    renditionLayout: "reflowable",
    renditionSpread: "none",
    readingDirection: "ltr",
    items: [],
    spineItems: [
      {
        id: "a.txt",
        href: "a.txt",
        mediaType: "text/plain",
        index: 0,
      },
      {
        id: "b.txt",
        href: "b.txt",
        mediaType: "text/plain",
        index: 1,
      },
    ],
  }

  const reader = createReader({
    layoutLayerTransition: false,
    pageTurnAnimation: "none",
    getResource: (item) => {
      return of(new Response(item.href))
    },
  })

  reader.load({
    // biome-ignore lint/style/noNonNullAssertion: TODO
    containerElement: document.getElementById(`app`)!,
    manifest,
  })

  // @ts-expect-error export for debug
  window.reader = reader

  const Progression = () => {
    const pagination = useObserve(reader.pagination.state$)

    return (
      <div
        style={{
          position: "absolute",
          left: "50%",
          top: "50%",
        }}
      >
        progression: {pagination?.percentageEstimateOfBook}
      </div>
    )
  }

  // biome-ignore lint/style/noNonNullAssertion: TODO
  createRoot(document.getElementById("reactRoot")!).render(<Progression />)
}

run()
