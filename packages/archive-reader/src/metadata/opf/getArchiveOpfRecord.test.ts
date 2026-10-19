import { describe, expect, it } from "vitest"
import { createArchive } from "../../archives/createArchive.ts"
import { blobFileAccessors } from "../../archives/fileAccessors.ts"
import { getArchiveOpfRecord } from "./getArchiveOpfRecord.ts"
import { readArchiveOpf } from "./readArchiveOpf.ts"

const textRecord = (uri: string, content = ``) => ({
  dir: false as const,
  basename: uri.split(`/`).pop() ?? uri,
  uri,
  size: content.length,
  ...blobFileAccessors(() => Promise.resolve(new Blob([content]))),
})

const archiveOf = (records: ReturnType<typeof textRecord>[]) =>
  createArchive({
    filename: `book.epub`,
    records,
    close: () => Promise.resolve(),
  })

const containerFile = (rootfiles: string) =>
  textRecord(
    `META-INF/container.xml`,
    `<?xml version="1.0"?><container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container"><rootfiles>${rootfiles}</rootfiles></container>`,
  )

const rootfile = (
  fullPath: string,
  mediaType = `application/oebps-package+xml`,
) => `<rootfile full-path="${fullPath}" media-type="${mediaType}"/>`

/** An `.opf` record the archive lists before the package document. */
const strayOpf = textRecord(`backup/old.opf`)

const findPackageDocumentUri = async (
  records: ReturnType<typeof textRecord>[],
) => (await getArchiveOpfRecord(archiveOf(records)))?.uri

describe(`getArchiveOpfRecord`, () => {
  it(`is the package document the container file lists`, async () => {
    expect(
      await findPackageDocumentUri([
        strayOpf,
        containerFile(rootfile(`OEBPS/content.opf`)),
        textRecord(`OEBPS/content.opf`),
      ]),
    ).toBe(`OEBPS/content.opf`)
  })

  it(`is the first of several renditions, the default one`, async () => {
    expect(
      await findPackageDocumentUri([
        textRecord(`fixed/package.opf`),
        textRecord(`reflowable/package.opf`),
        containerFile(
          rootfile(`reflowable/package.opf`) + rootfile(`fixed/package.opf`),
        ),
      ]),
    ).toBe(`reflowable/package.opf`)
  })

  it(`passes over a rendition in another format, as an EPUB 2 container lists a PDF`, async () => {
    expect(
      await findPackageDocumentUri([
        strayOpf,
        textRecord(`book.pdf`),
        containerFile(
          rootfile(`book.pdf`, `application/pdf`) +
            rootfile(`OEBPS/content.opf`),
        ),
        textRecord(`OEBPS/content.opf`),
      ]),
    ).toBe(`OEBPS/content.opf`)
  })

  it(`passes over a listed package document the archive does not hold`, async () => {
    expect(
      await findPackageDocumentUri([
        strayOpf,
        containerFile(rootfile(`missing.opf`) + rootfile(`OEBPS/content.opf`)),
        textRecord(`OEBPS/content.opf`),
      ]),
    ).toBe(`OEBPS/content.opf`)
  })

  it(`reads the full path as a URL relative to the root of the container`, async () => {
    expect(
      await findPackageDocumentUri([
        strayOpf,
        containerFile(rootfile(`My%20Book/content.opf`)),
        textRecord(`My Book/content.opf`),
      ]),
    ).toBe(`My Book/content.opf`)
  })

  it(`reads a container file whose elements carry a prefix`, async () => {
    expect(
      await findPackageDocumentUri([
        strayOpf,
        textRecord(
          `META-INF/container.xml`,
          `<?xml version="1.0"?><ocf:container version="1.0" xmlns:ocf="urn:oasis:names:tc:opendocument:xmlns:container"><ocf:rootfiles><ocf:rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/></ocf:rootfiles></ocf:container>`,
        ),
        textRecord(`OEBPS/content.opf`),
      ]),
    ).toBe(`OEBPS/content.opf`)
  })

  it.each([
    [
      `without a container file, as the archive prose makes of a PDF`,
      [textRecord(`content.opf`), textRecord(`0.pdf`)],
      `content.opf`,
    ],
    [
      `with a container file listing nothing the archive holds`,
      [containerFile(rootfile(`missing.opf`)), textRecord(`OEBPS/content.opf`)],
      `OEBPS/content.opf`,
    ],
    [
      `with a container file that does not parse`,
      [
        textRecord(
          `META-INF/container.xml`,
          `<container><rootfiles></container>`,
        ),
        textRecord(`OEBPS/content.opf`),
      ],
      `OEBPS/content.opf`,
    ],
    [
      `whose extension is in capitals`,
      [textRecord(`OEBPS/CONTENT.OPF`)],
      `OEBPS/CONTENT.OPF`,
    ],
  ])(`is the first .opf record %s`, async (_, records, expected) => {
    expect(await findPackageDocumentUri(records)).toBe(expected)
  })

  it(`gives readArchiveOpf the folder of the package document it finds`, async () => {
    const archiveOpf = await readArchiveOpf(
      archiveOf([
        textRecord(`fixed/package.opf`, `<package/>`),
        textRecord(`reflowable/package.opf`, `<package/>`),
        containerFile(
          rootfile(`reflowable/package.opf`) + rootfile(`fixed/package.opf`),
        ),
      ]),
    )

    expect(archiveOpf?.basePath).toBe(`reflowable`)
  })
})
