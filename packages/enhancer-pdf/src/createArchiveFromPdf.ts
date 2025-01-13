import type { Archive } from "@prose-reader/streamer"
import * as pdfjsLib from "pdfjs-dist"

type PdfJsArchive = Archive & {
  _symbol: symbol
  proxyDocument: pdfjsLib.PDFDocumentProxy
}

const PDF_SYMBOL = Symbol(`pdfjs`)

export const isPdfJsArchive = (archive: Archive): archive is PdfJsArchive =>
  "_symbol" in archive && archive._symbol === PDF_SYMBOL

/**
 * @important
 * Make sure the urls are on the same origin or the cors header is set otherwise
 * the resource cannot be consumed as it is on the web.
 */
export const createArchiveFromPdf = async (file: Blob): Promise<Archive> => {
  const loadingTask = pdfjsLib.getDocument(await file.arrayBuffer())

  const pdf = await loadingTask.promise

  const pages = Array.from({ length: pdf.numPages })

  const opfFileData = `
    <?xml version="1.0" encoding="UTF-8"?><package xmlns="http://www.idpf.org/2007/opf" version="2.0" unique-identifier="bookid">
      <metadata>
        <meta property="rendition:layout">pre-paginated</meta>
      </metadata>
      <manifest>
        ${pages.map((_, index) => `<item id="${index}" href="${index}.pdf" />`).join(`\n`)}
      </manifest>
      <spine>
        ${pages.map((_, index) => `<itemref idref="${index}" />`).join(`\n`)}
      </spine>
    </package>
  `

  const opfFile: Archive[`files`][number] = {
    dir: false,
    basename: `content.opf`,
    uri: `content.opf`,
    size: 0,
    blob: async () => new Blob(),
    string: async () => opfFileData,
  }

  const archive = {
    filename: file.name,
    proxyDocument: pdf,
    _symbol: PDF_SYMBOL,
    files: [
      opfFile,
      ...pages.map((_, index) => ({
        dir: false,
        blob: async () => {
          throw new Error("Unable to get blob from pdf")
        },
        basename: `${index}.pdf`,
        size: 0,
        string: () => {
          throw new Error("Unable to get blob from pdf")
        },
        uri: `${index}.pdf`,
      })),
    ],
    close: () => {
      return pdf.cleanup()
    },
  } satisfies PdfJsArchive

  return archive as Archive
}
