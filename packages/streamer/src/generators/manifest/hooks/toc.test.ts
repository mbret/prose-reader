import {
  blobFileAccessors,
  createArchive,
  readArchiveOpf,
} from "@prose-reader/archive-reader"
import { expect, it } from "vitest"
import { tocHook } from "./toc"

it("should create valid toc", async () => {
  const manifest = await tocHook({
    archive: createArchive({
      filename: "archive",
      close: async () => {},
      records: [
        {
          basename: "2.jpg",
          ...blobFileAccessors(() => Promise.resolve(new Blob([]))),
          dir: false,
          size: 0,
          uri: "folder c/2.jpg",
        },
        {
          basename: "1.jpg",
          ...blobFileAccessors(() => Promise.resolve(new Blob([]))),
          dir: false,
          size: 0,
          uri: "folder c/1.jpg",
        },
        {
          basename: "1.jpg",
          ...blobFileAccessors(() => Promise.resolve(new Blob([]))),
          dir: false,
          size: 0,
          uri: "folder a/folder b/1.jpg",
        },
        {
          basename: "Screenshot from 2024-08-28 13-21-11.png",
          ...blobFileAccessors(() => Promise.resolve(new Blob([]))),
          dir: false,
          size: 0,
          uri: "folder a/Screenshot from 2024-08-28 13-21-11.png",
        },
        {
          basename: "4.jpg",
          ...blobFileAccessors(() => Promise.resolve(new Blob([]))),
          dir: false,
          size: 0,
          uri: "folder d/folder e/4.jpg",
        },
      ],
    }),
    baseUrl: "",
    archiveOpf: undefined,
  })({
    filename: "",
    items: [],
    readingDirection: "ltr",
    renditionLayout: "pre-paginated",
    renditionSpread: "auto",
    spineItems: [],
    title: "",
  })

  expect(manifest.nav).toEqual({
    toc: [
      {
        contents: [
          {
            contents: [],
            href: "folder%20a/folder%20b/1.jpg",
            path: "folder a/folder b/1.jpg",
            title: "folder b",
          },
        ],
        href: "folder%20a/Screenshot%20from%202024-08-28%2013-21-11.png",
        path: "folder a/Screenshot from 2024-08-28 13-21-11.png",
        title: "folder a",
      },
      {
        contents: [],
        href: "folder%20c/1.jpg",
        path: "folder c/1.jpg",
        title: "folder c",
      },
      {
        contents: [
          {
            contents: [],
            href: "folder%20d/folder%20e/4.jpg",
            path: "folder d/folder e/4.jpg",
            title: "folder e",
          },
        ],
        href: "folder%20d/folder%20e/4.jpg",
        path: "folder d/folder e/4.jpg",
        title: "folder d",
      },
    ],
  })
})

it("should join epub toc entries onto the base url without extra slash", async () => {
  const opf = `<?xml version="1.0"?><package xmlns="http://www.idpf.org/2007/opf" version="2.0"><manifest><item id="ncxtoc" media-type="application/x-dtbncx+xml" href="toc.ncx"/></manifest><spine toc="ncxtoc"></spine></package>`
  const ncx = `<?xml version="1.0"?><ncx xmlns="http://www.daisy.org/z3986/2005/ncx/"><navMap><navPoint id="ch1"><navLabel><text>Chapter 1</text></navLabel><content src="index.html"/></navPoint></navMap></ncx>`

  const archive = createArchive({
    filename: "archive",
    close: async () => {},
    records: [
      {
        basename: "content.opf",
        ...blobFileAccessors(() => Promise.resolve(new Blob([opf]))),
        dir: false,
        size: opf.length,
        uri: "OEBPS/content.opf",
      },
      {
        basename: "toc.ncx",
        ...blobFileAccessors(() => Promise.resolve(new Blob([ncx]))),
        dir: false,
        size: ncx.length,
        uri: "OEBPS/toc.ncx",
      },
    ],
  })

  const archiveOpf = await readArchiveOpf(archive)

  const manifest = await tocHook({
    archive,
    baseUrl: "http://localhost:9000/streamer/",
    archiveOpf,
  })({
    filename: "",
    items: [],
    readingDirection: "ltr",
    renditionLayout: "pre-paginated",
    renditionSpread: "auto",
    spineItems: [],
    title: "",
  })

  expect(manifest.nav).toEqual({
    toc: [
      {
        contents: [],
        href: "http://localhost:9000/streamer/OEBPS/index.html",
        path: "OEBPS/index.html",
        title: "Chapter 1",
      },
    ],
  })
})
