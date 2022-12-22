import xmldoc from "xmldoc"
import fs from "fs"
import path from "path"
import { parseToc } from "./nav"
import { Archive } from ".."
import { expect, it, test } from "vitest"

test(`Given ncx toc with prefix`, () => {
  it(`should generate toc correctly`, async () => {
    const toc = (await fs.promises.readFile(path.resolve(__dirname, `../tests/tocWithPrefix/toc.ncx`))).toString()
    const opf = (await fs.promises.readFile(path.resolve(__dirname, `../tests/tocWithPrefix/content.opf`))).toString()
    const tocResult = (await fs.promises.readFile(path.resolve(__dirname, `../tests/tocWithPrefix/toc.json`))).toString()

    const opfXmlDoc = new xmldoc.XmlDocument(opf)

    const archive: Archive = {
      filename: `archive`,
      files: [
        {
          dir: false,
          basename: `content.opf`,
          uri: `OEBPS/content.opf`,
          blob: async () => new Blob([``]),
          string: async () => ``,
          base64: async () => ``,
          size: 0
        },
        {
          dir: false,
          basename: `toc.ncx`,
          uri: `OEBPS/toc.ncx`,
          blob: async () => new Blob([toc]),
          string: async () => toc,
          base64: async () => btoa(toc),
          size: 0
        }
      ]
    }

    const result = await parseToc(opfXmlDoc, archive, {
      baseUrl: `http://localhost:9000/streamer/aHR0cDovL2xvY2FsaG9zdDo5MDAwL2VwdWJzL0FVVE9UT09MUy5lcHVi`
    })

    expect(result).toEqual(JSON.parse(tocResult))
  })
})
