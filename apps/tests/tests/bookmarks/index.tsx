import { createReader } from "@prose-reader/core"
import {
  type Annotation,
  annotationsEnhancer,
} from "@prose-reader/enhancer-annotations"
import { gesturesEnhancer } from "@prose-reader/enhancer-gestures"
import { createArchiveFromPdf, pdfEnhancer } from "@prose-reader/enhancer-pdf"
import { generateManifestFromArchive } from "@prose-reader/streamer"
import * as pdfjsLib from "pdfjs-dist"
import pdfWorkerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url"
import pdfjsViewerInlineCss from "pdfjs-dist/web/pdf_viewer.css?inline"
import { createRoot } from "react-dom/client"
import { useObserve } from "reactjrx"
import { BehaviorSubject, of } from "rxjs"

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  pdfWorkerUrl,
  import.meta.url,
).toString()

async function run() {
  const response = await fetch("http://localhost:3333/epubs/sample-3.pdf")
  const pdfBlob = await response.blob()
  const archive = await createArchiveFromPdf(pdfBlob, "sample.pdf")
  const manifest = await generateManifestFromArchive(archive)
  const annotations$ = new BehaviorSubject<Annotation[]>([])

  const createReaderWithEnhancers = gesturesEnhancer(
    pdfEnhancer(annotationsEnhancer(createReader)),
  )

  const reader = createReaderWithEnhancers({
    pageTurnAnimation: "none",
    layoutLayerTransition: false,
    pdf: {
      pdfjsViewerInlineCss,
      getArchiveForItem: () => {
        return of(archive)
      },
    },
    annotations: {
      annotations$,
    },
  })

  const Bookmarks = () => {
    const pagination = useObserve(() => reader.pagination.state$, [reader])
    const bookmarks = useObserve(
      () => reader.annotations.annotations$,
      [reader],
    )

    const consolidatedBookmarks = useObserve(
      () => reader.locateResource(bookmarks ?? []),
      [reader, bookmarks],
    )

    const bookmarkForPage = consolidatedBookmarks?.find(
      (bookmark) =>
        bookmark.meta?.absolutePageIndex === pagination?.beginAbsolutePageIndex,
    )

    return (
      <button
        type="button"
        id="mark"
        style={{
          position: "absolute",
          left: "50%",
          top: "50%",
          border: "1px solid red",
          backgroundColor: bookmarkForPage ? "green" : "red",
          width: 100,
          height: 100,
          color: "white",
        }}
        onClick={() => {
          if (bookmarkForPage) {
            annotations$.next(
              annotations$.value.filter(
                (annotation) => annotation.id !== bookmarkForPage.resource.id,
              ),
            )
          } else {
            const annotation = reader.annotations.createAnnotation({
              absolutePageIndex: pagination?.beginAbsolutePageIndex ?? 0,
            })

            if (annotation) {
              annotations$.next([...annotations$.value, annotation])
            }
          }
        }}
      >
        Page {pagination?.beginAbsolutePageIndex}
      </button>
    )
  }

  // biome-ignore lint/style/noNonNullAssertion: TODO
  createRoot(document.getElementById("bookmarks")!).render(<Bookmarks />)

  reader.load({
    // biome-ignore lint/style/noNonNullAssertion: TODO
    containerElement: document.getElementById(`app`)!,
    manifest,
  })

  // @ts-expect-error export for debug
  window.reader = reader
}

run()
