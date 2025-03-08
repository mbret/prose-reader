import { createReader } from "@prose-reader/core"
import { bookmarksEnhancer } from "@prose-reader/enhancer-bookmarks"
import { gesturesEnhancer } from "@prose-reader/enhancer-gestures"
import { createArchiveFromPdf, pdfEnhancer } from "@prose-reader/enhancer-pdf"
import { generateManifestFromArchive } from "@prose-reader/streamer"
import * as pdfjsLib from "pdfjs-dist"
import pdfWorkerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url"
import pdfjsViewerInlineCss from "pdfjs-dist/web/pdf_viewer.css?inline"
import { useEffect, useState } from "react"
import { createRoot } from "react-dom/client"
import { of, switchMap } from "rxjs"

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  pdfWorkerUrl,
  import.meta.url,
).toString()

async function run() {
  const response = await fetch("http://localhost:3333/epubs/sample-3.pdf")
  const pdfBlob = await response.blob()
  const archive = await createArchiveFromPdf(pdfBlob, "sample.pdf")
  const manifest = await generateManifestFromArchive(archive)

  const createReaderWithEnhancers = gesturesEnhancer(
    pdfEnhancer(bookmarksEnhancer(createReader)),
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
  })

  const Bookmarks = () => {
    const [bookmarks, setBookmarks] = useState<
      { meta?: { absolutePageIndex?: number | undefined } }[]
    >([])
    const [pagination, setPagination] = useState<{
      beginAbsolutePageIndex?: number
    }>({ beginAbsolutePageIndex: 0 })

    useEffect(() => {
      reader.pagination.state$.subscribe((state) => {
        setPagination(state)
      })
    }, [])

    useEffect(() => {
      reader.bookmarks.bookmarks$
        .pipe(switchMap((bookmarks) => reader.locateResource(bookmarks)))
        .subscribe((data) => {
          setBookmarks(data)
        })
    }, [])

    const bookmarkForPage = bookmarks?.find(
      (bookmark) =>
        bookmark.meta?.absolutePageIndex === pagination.beginAbsolutePageIndex,
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
          reader.bookmarks.bookmark(pagination.beginAbsolutePageIndex ?? 0)
        }}
      >
        Page {pagination.beginAbsolutePageIndex}
      </button>
    )
  }

  // biome-ignore lint/style/noNonNullAssertion: <explanation>
  createRoot(document.getElementById("bookmarks")!).render(<Bookmarks />)

  reader.load({
    // biome-ignore lint/style/noNonNullAssertion: <explanation>
    containerElement: document.getElementById(`app`)!,
    manifest,
  })

  // @ts-expect-error export for debug
  window.reader = reader
}

run()
