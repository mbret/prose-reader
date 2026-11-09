/* @vitest-environment happy-dom */

import type { Archive } from "@prose-reader/archive-reader"
import { createReader, type Manifest } from "@prose-reader/core"
import { Observable } from "rxjs"
import { describe, expect, it, onTestFinished, vi } from "vitest"
import { createArchiveFromPdf } from "./createArchiveFromPdf"
import { pdfEnhancer } from "./pdfEnhancer"

/**
 * pdf.js stands for a one-page document whose page never arrives, so a page
 * load stays in progress until the reader is destroyed.
 */
const pdfjs = vi.hoisted(() => ({
  document: {
    numPages: 1,
    getPage: () => new Promise<never>(() => undefined),
  },
  destroyLoadingTask: vi.fn(() => Promise.resolve()),
}))

vi.mock("pdfjs-dist", () => ({
  getDocument: () => ({
    promise: Promise.resolve(pdfjs.document),
    destroy: pdfjs.destroyLoadingTask,
  }),
  RenderingCancelledException: class RenderingCancelledException extends Error {},
  TextLayer: class TextLayer {},
}))

const pageItem: Manifest["items"][number] = {
  id: `page-0`,
  href: `http://localhost/0.pdf`,
  mediaType: `application/pdf`,
}

const pdfManifest: Manifest = {
  filename: `book.pdf`,
  mediaType: `application/pdf`,
  title: `book`,
  renditionLayout: `pre-paginated`,
  renditionSpread: undefined,
  readingDirection: `ltr`,
  spineItems: [{ ...pageItem, index: 0, containerUri: `0.pdf` }],
  items: [pageItem],
}

const createPdfArchive = () =>
  createArchiveFromPdf(new Blob([`%PDF-1.7`]), `book.pdf`)

describe(`pdfEnhancer`, () => {
  it(`holds the archive of a page from its first read until the reader is destroyed`, async () => {
    const archive = await createPdfArchive()
    const archiveHolds: string[] = []
    const firstHold = Promise.withResolvers<void>()
    const reader = pdfEnhancer(createReader)({
      manifest: pdfManifest,
      pdf: {
        pdfjsViewerInlineCss: ``,
        getArchiveForItem: () =>
          new Observable<Archive>((subscriber) => {
            archiveHolds.push(`hold`)
            firstHold.resolve()
            subscriber.next(archive)

            return function recordRelease() {
              archiveHolds.push(`release`)
            }
          }),
      },
    })
    const container = document.createElement(`div`)

    vi.spyOn(HTMLElement.prototype, `clientWidth`, `get`).mockReturnValue(100)
    vi.spyOn(HTMLElement.prototype, `clientHeight`, `get`).mockReturnValue(200)
    document.body.appendChild(container)
    onTestFinished(() => {
      container.remove()
      vi.restoreAllMocks()
    })

    expect(archiveHolds).toEqual([])

    reader.mount(container)

    await firstHold.promise

    expect(archiveHolds).toEqual([`hold`])

    reader.destroy()

    expect(archiveHolds).toEqual([`hold`, `release`])
  })
})

describe(`createArchiveFromPdf`, () => {
  it(`destroys the pdf.js loading task, and its worker, when the archive closes`, async () => {
    const archive = await createPdfArchive()

    await archive.close()

    expect(pdfjs.destroyLoadingTask).toHaveBeenCalledOnce()
  })
})
