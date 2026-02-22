// @vitest-environment jsdom
import type { Manifest } from "@prose-reader/shared"
import { describe, expect, it } from "vitest"
import type { PageEntry } from "../../../spine/Pages"
import type { SpineItem } from "../../../spineItem/SpineItem"
import {
  buildTocCandidatesBySpineHref,
  buildTocIndex,
  resolveChapterInfoFromVisibleNode,
} from "./index"

const BASE_MANIFEST: Manifest = {
  filename: "",
  items: [],
  readingDirection: "ltr",
  renditionLayout: "pre-paginated",
  renditionSpread: "auto",
  spineItems: [],
  title: "",
}

const createSpineItemForDoc = ({
  id,
  href,
  doc,
}: {
  id: string
  href: string
  doc: Document
}) => {
  const frame = { contentDocument: doc } as unknown as HTMLIFrameElement

  return {
    item: { id, href },
    renderer: {
      getDocumentFrame: () => frame,
    },
  } as unknown as SpineItem
}

const createNextPageEntry = ({
  node,
  offset,
}: {
  node: Node | undefined
  offset: number | undefined
}) => {
  return {
    firstVisibleNode:
      node !== undefined && offset !== undefined ? { node, offset } : undefined,
  } as PageEntry
}

describe("resolveChapterInfoFromVisibleNode", () => {
  it("resolves subchapter from visible node", () => {
    const chapterHref = "http://localhost:9000/streamer/book/EPUB/ch02.xhtml"
    const manifest: Manifest = {
      ...BASE_MANIFEST,
      nav: {
        toc: [
          {
            title: "2. Building a Better EPUB: Fundamental Accessibility",
            path: "EPUB/ch02.xhtml",
            href: chapterHref,
            contents: [
              {
                title: "Page Numbering",
                path: "EPUB/ch02.xhtml#_page_numbering",
                href: `${chapterHref}#_page_numbering`,
                contents: [],
              },
            ],
          },
        ],
      },
      spineItems: [
        {
          href: chapterHref,
          id: "ch02",
          pageSpreadLeft: true,
          pageSpreadRight: true,
          progressionWeight: 0,
          renditionLayout: "reflowable",
          index: 0,
        },
      ],
    }

    const doc = document.implementation.createHTMLDocument("chapter")
    const heading = doc.createElement("h1")
    heading.id = "_page_numbering"
    heading.textContent = "Page Numbering"
    doc.body.appendChild(heading)

    const spineItem = createSpineItemForDoc({
      id: "ch02",
      href: chapterHref,
      doc,
    })
    const tocIndex = buildTocIndex(manifest.nav?.toc ?? [], manifest)
    const candidates =
      buildTocCandidatesBySpineHref({ manifest, tocIndex }).get(chapterHref) ??
      []

    const result = resolveChapterInfoFromVisibleNode({
      node: heading.firstChild ?? heading,
      offset: 0,
      candidates,
      spineItem,
      nextPageEntry: undefined,
    })

    expect(result).toEqual({
      title: "2. Building a Better EPUB: Fundamental Accessibility",
      path: "EPUB/ch02.xhtml",
      subChapter: {
        title: "Page Numbering",
        path: "EPUB/ch02.xhtml#_page_numbering",
      },
    })
  })

  it("selects the last candidate strictly before next page boundary", () => {
    const chapterHref = "http://localhost:9000/streamer/book/EPUB/ch02.xhtml"
    const manifest: Manifest = {
      ...BASE_MANIFEST,
      nav: {
        toc: [
          {
            title: "Chapter 2",
            path: "EPUB/ch02.xhtml",
            href: chapterHref,
            contents: [
              {
                title: "A",
                path: "EPUB/ch02.xhtml#_a",
                href: `${chapterHref}#_a`,
                contents: [],
              },
              {
                title: "B",
                path: "EPUB/ch02.xhtml#_b",
                href: `${chapterHref}#_b`,
                contents: [],
              },
              {
                title: "C",
                path: "EPUB/ch02.xhtml#_c",
                href: `${chapterHref}#_c`,
                contents: [],
              },
            ],
          },
        ],
      },
      spineItems: [
        {
          href: chapterHref,
          id: "ch02",
          pageSpreadLeft: true,
          pageSpreadRight: true,
          progressionWeight: 0,
          renditionLayout: "reflowable",
          index: 0,
        },
      ],
    }

    const doc = document.implementation.createHTMLDocument("chapter")
    const a = doc.createElement("h2")
    a.id = "_a"
    a.textContent = "A"
    doc.body.appendChild(a)
    const betweenAAndB = doc.createTextNode("between-a-and-b")
    doc.body.appendChild(betweenAAndB)
    const b = doc.createElement("h2")
    b.id = "_b"
    b.textContent = "B"
    doc.body.appendChild(b)
    const betweenBAndC = doc.createTextNode("between-b-and-c")
    doc.body.appendChild(betweenBAndC)
    const c = doc.createElement("h2")
    c.id = "_c"
    c.textContent = "C"
    doc.body.appendChild(c)

    const spineItem = createSpineItemForDoc({
      id: "ch02",
      href: chapterHref,
      doc,
    })
    const tocIndex = buildTocIndex(manifest.nav?.toc ?? [], manifest)
    const candidates =
      buildTocCandidatesBySpineHref({ manifest, tocIndex }).get(chapterHref) ??
      []

    const result = resolveChapterInfoFromVisibleNode({
      node: betweenAAndB,
      offset: 0,
      candidates,
      spineItem,
      nextPageEntry: createNextPageEntry({ node: c, offset: 0 }),
    })

    expect(result).toEqual({
      title: "Chapter 2",
      path: "EPUB/ch02.xhtml",
      subChapter: {
        title: "B",
        path: "EPUB/ch02.xhtml#_b",
      },
    })
  })

  it("returns undefined when nextPageEntry exists without firstVisibleNode", () => {
    const chapterHref = "http://localhost:9000/streamer/book/EPUB/ch02.xhtml"
    const manifest: Manifest = {
      ...BASE_MANIFEST,
      nav: {
        toc: [
          {
            title: "Chapter 2",
            path: "EPUB/ch02.xhtml",
            href: chapterHref,
            contents: [
              {
                title: "Page Numbering",
                path: "EPUB/ch02.xhtml#_page_numbering",
                href: `${chapterHref}#_page_numbering`,
                contents: [],
              },
            ],
          },
        ],
      },
      spineItems: [
        {
          href: chapterHref,
          id: "ch02",
          pageSpreadLeft: true,
          pageSpreadRight: true,
          progressionWeight: 0,
          renditionLayout: "reflowable",
          index: 0,
        },
      ],
    }

    const doc = document.implementation.createHTMLDocument("chapter")
    const heading = doc.createElement("h1")
    heading.id = "_page_numbering"
    heading.textContent = "Page Numbering"
    doc.body.appendChild(heading)

    const spineItem = createSpineItemForDoc({
      id: "ch02",
      href: chapterHref,
      doc,
    })
    const tocIndex = buildTocIndex(manifest.nav?.toc ?? [], manifest)
    const candidates =
      buildTocCandidatesBySpineHref({ manifest, tocIndex }).get(chapterHref) ??
      []

    const result = resolveChapterInfoFromVisibleNode({
      node: heading.firstChild ?? heading,
      offset: 0,
      candidates,
      spineItem,
      nextPageEntry: createNextPageEntry({
        node: undefined,
        offset: undefined,
      }),
    })

    expect(result).toBeUndefined()
  })
})
