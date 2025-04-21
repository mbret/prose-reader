import fs from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"
import { XmlDocument } from "xmldoc"
import type { Archive } from ".."
import { parseToc } from "./nav"

describe(`Given ncx toc with prefix`, () => {
  it(`should generate toc correctly`, async () => {
    const toc = (
      await fs.promises.readFile(
        path.resolve(__dirname, `../tests/tocWithPrefix/toc.ncx`),
      )
    ).toString()
    const opf = (
      await fs.promises.readFile(
        path.resolve(__dirname, `../tests/tocWithPrefix/content.opf`),
      )
    ).toString()
    const tocResult = (
      await fs.promises.readFile(
        path.resolve(__dirname, `../tests/tocWithPrefix/toc.json`),
      )
    ).toString()

    const opfXmlDoc = new XmlDocument(opf)

    const archive: Archive = {
      filename: `archive`,
      files: [
        {
          dir: false,
          basename: `content.opf`,
          uri: `OEBPS/content.opf`,
          blob: async () => new Blob([``]),
          string: async () => ``,
          size: 0,
        },
        {
          dir: false,
          basename: `toc.ncx`,
          uri: `OEBPS/toc.ncx`,
          blob: async () => new Blob([toc]),
          string: async () => toc,
          size: 0,
        },
      ],
      close: () => Promise.resolve(),
    }

    const result = await parseToc(opfXmlDoc, archive, {
      baseUrl: `http://localhost:9000/streamer/aHR0cDovL2xvY2FsaG9zdDo5MDAwL2VwdWJzL0FVVE9UT09MUy5lcHVi`,
    })

    expect(result).toEqual(JSON.parse(tocResult))
  })
})

describe("Given a base url with a slash at the end", () => {
  it(`should generate href with no extra slash`, async () => {
    const toc = (
      await fs.promises.readFile(
        path.resolve(__dirname, `../tests/tocWithPrefix/toc.ncx`),
      )
    ).toString()
    const opf = (
      await fs.promises.readFile(
        path.resolve(__dirname, `../tests/tocWithPrefix/content.opf`),
      )
    ).toString()

    const opfXmlDoc = new XmlDocument(opf)

    const archive: Archive = {
      filename: `archive`,
      files: [
        {
          dir: false,
          basename: `content.opf`,
          uri: `OEBPS/content.opf`,
          blob: async () => new Blob([``]),
          string: async () => ``,
          size: 0,
        },
        {
          dir: false,
          basename: `toc.ncx`,
          uri: `OEBPS/toc.ncx`,
          blob: async () => new Blob([toc]),
          string: async () => toc,
          size: 0,
        },
      ],
      close: () => Promise.resolve(),
    }

    const result = await parseToc(opfXmlDoc, archive, {
      baseUrl: `http://localhost:9000/streamer/`,
    })

    expect((result ?? [])[0]?.href).toEqual(
      `http://localhost:9000/streamer/OEBPS/index.html`,
    )
  })
})
