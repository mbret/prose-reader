/* @vitest-environment happy-dom */

import type { Archive } from "@prose-reader/archive-reader"
import { createReader, type Manifest } from "@prose-reader/core"
import { Observable, type Subscriber } from "rxjs"
import { describe, expect, it, onTestFinished, vi } from "vitest"
import { createArchiveFromPdf } from "./createArchiveFromPdf"
import { pdfEnhancer } from "./pdfEnhancer"

/**
 * The mocked pdf.js opens a one-page document whose page never arrives, so a
 * page read stays in progress until the reader is destroyed.
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

/**
 * A reader whose `getArchiveForItem` records each hold on the archive and its
 * release, and answers each hold with `answerHold`.
 */
const createReaderRecordingArchiveHolds = (
  answerHold: (subscriber: Subscriber<Archive>) => void,
) => {
  const archiveHolds: string[] = []
  const getArchiveForItem = vi.fn(
    () =>
      new Observable<Archive>((subscriber) => {
        archiveHolds.push(`hold`)
        answerHold(subscriber)

        return function recordRelease() {
          archiveHolds.push(`release`)
        }
      }),
  )
  const reader = pdfEnhancer(createReader)({
    manifest: pdfManifest,
    pdf: { pdfjsViewerInlineCss: ``, getArchiveForItem },
  })

  return { reader, archiveHolds, getArchiveForItem }
}

describe(`pdfEnhancer`, () => {
  it(`holds the archive of a page from its first read until the reader is destroyed`, async () => {
    const archive = await createPdfArchive()
    const firstHold = Promise.withResolvers<void>()
    const { reader, archiveHolds, getArchiveForItem } =
      createReaderRecordingArchiveHolds(
        function answerWithTheArchive(subscriber) {
          firstHold.resolve()
          subscriber.next(archive)
        },
      )
    const container = document.createElement(`div`)

    vi.spyOn(HTMLElement.prototype, `clientWidth`, `get`).mockReturnValue(100)
    vi.spyOn(HTMLElement.prototype, `clientHeight`, `get`).mockReturnValue(200)
    document.body.appendChild(container)
    onTestFinished(() => {
      container.remove()
      vi.restoreAllMocks()
    })

    expect(getArchiveForItem).not.toHaveBeenCalled()

    reader.mount(container)

    await firstHold.promise

    expect(archiveHolds).toEqual([`hold`])

    reader.destroy()

    expect(archiveHolds).toEqual([`hold`, `release`])
  })

  it(`asks for no archive for a page read after the reader is destroyed`, async () => {
    const archive = await createPdfArchive()
    const { reader, getArchiveForItem } = createReaderRecordingArchiveHolds(
      function answerWithTheArchive(subscriber) {
        subscriber.next(archive)
      },
    )

    reader.destroy()
    reader.renderHeadless(0).subscribe()

    expect(getArchiveForItem).not.toHaveBeenCalled()
  })

  it(`releases a hold whose archive fails, and holds again on the next read`, async () => {
    const archive = await createPdfArchive()
    const archiveAnswers = [
      function failToOpen(subscriber: Subscriber<Archive>) {
        subscriber.error(new Error(`archive unavailable`))
      },
      function answerWithTheArchive(subscriber: Subscriber<Archive>) {
        subscriber.next(archive)
      },
    ]
    const { reader, archiveHolds } = createReaderRecordingArchiveHolds(
      function answerWithTheNextAnswer(subscriber) {
        archiveAnswers.shift()?.(subscriber)
      },
    )

    vi.spyOn(console, `error`).mockImplementation(() => undefined)
    onTestFinished(() => {
      vi.restoreAllMocks()
    })

    reader.renderHeadless(0).subscribe()

    expect(archiveHolds).toEqual([`hold`, `release`])

    reader.renderHeadless(0).subscribe()

    expect(archiveHolds).toEqual([`hold`, `release`, `hold`])

    reader.destroy()

    expect(archiveHolds).toEqual([`hold`, `release`, `hold`, `release`])
  })
})

describe(`createArchiveFromPdf`, () => {
  it(`destroys the pdf.js loading task, and its worker, when the archive closes`, async () => {
    const archive = await createPdfArchive()

    await archive.close()

    expect(pdfjs.destroyLoadingTask).toHaveBeenCalledOnce()
  })
})
