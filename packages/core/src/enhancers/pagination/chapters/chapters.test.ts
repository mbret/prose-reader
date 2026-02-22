import type { Manifest } from "@prose-reader/shared"
import { describe, expect, it } from "vitest"
import templateManifest from "../tests/chapters-template-a.json"
import templateManifestB from "../tests/chapters-template-b.json"
import { buildChaptersInfo } from "."

const manifest = templateManifest as unknown as Manifest
const manifestB = templateManifestB as unknown as Manifest

describe("buildChaptersInfo", () => {
  const toc: NonNullable<Manifest["nav"]>["toc"] =
    manifest.nav?.toc ?? ([] as NonNullable<Manifest["nav"]>["toc"])

  it("returns undefined for spine items not in TOC (e.g. cover)", () => {
    const coverHref = manifest.spineItems[0]?.href
    if (!coverHref) throw new Error("expected spine item")
    const result = buildChaptersInfo(coverHref, toc, manifest)
    expect(result).toBeUndefined()
  })

  it("returns correct chapter info for TOC entry (Table of Contents)", () => {
    const tocSpineItem = manifest.spineItems.find((item) =>
      item.href.includes("TableOfContents.html"),
    )
    if (!tocSpineItem) throw new Error("expected spine item")
    const result = buildChaptersInfo(tocSpineItem.href, toc, manifest)
    expect(result).toEqual({
      title: "Table of Contents",
      path: "OEBPS/Text/TableOfContents.html#tableofcontents",
    })
  })

  it("returns correct chapter info for Chapter 1 (section-0007)", () => {
    const chapter1Item = manifest.spineItems.find((item) =>
      item.href.includes("section-0007.html"),
    )
    if (!chapter1Item) throw new Error("expected spine item")
    const result = buildChaptersInfo(chapter1Item.href, toc, manifest)
    expect(result).toEqual({
      title: "Chapter 1: The Nosferatu and the Zilant",
      path: "OEBPS/Text/section-0007.html#auto_bookmark_toc_top",
    })
  })

  it("returns correct chapter info for Chapter 5 (section-0012)", () => {
    const chapter5Item = manifest.spineItems.find((item) =>
      item.href.includes("section-0012.html"),
    )
    if (!chapter5Item) throw new Error("expected spine item")
    const result = buildChaptersInfo(chapter5Item.href, toc, manifest)
    expect(result).toEqual({
      title: "Chapter 5: The Territory of the Gods",
      path: "OEBPS/Text/section-0012.html#auto_bookmark_toc_top",
    })
  })

  it("returns correct chapter info for last TOC entry (Newsletter)", () => {
    const newsletterItem = manifest.spineItems.find((item) =>
      item.href.includes("section-0016.html"),
    )
    if (!newsletterItem) throw new Error("expected spine item")
    const result = buildChaptersInfo(newsletterItem.href, toc, manifest)
    expect(result).toEqual({
      title: "Newsletter",
      path: "OEBPS/Text/section-0016.html#auto_bookmark_toc_top",
    })
  })
})

describe("buildChaptersInfo (template-b)", () => {
  const toc: NonNullable<Manifest["nav"]>["toc"] =
    manifestB.nav?.toc ?? ([] as NonNullable<Manifest["nav"]>["toc"])

  it("returns expected chapter and subchapter for ch03s02", () => {
    const item = manifestB.spineItems.find((spineItem) =>
      spineItem.href.includes("ch03s02.xhtml"),
    )
    if (!item) throw new Error("expected spine item")

    const result = buildChaptersInfo(item.href, toc, manifestB)

    expect(result).toEqual({
      title: "3. It’s Alive: Rich Content Accessibility",
      path: "EPUB/ch03.xhtml",
      subChapter: {
        title: "Talk to Me: Media Overlays",
        path: "EPUB/ch03s02.xhtml",
      },
    })
  })

  it("returns expected chapter and subchapter for ch02s02", () => {
    const item = manifestB.spineItems.find((spineItem) =>
      spineItem.href.includes("ch02s02.xhtml"),
    )
    if (!item) throw new Error("expected spine item")

    const result = buildChaptersInfo(item.href, toc, manifestB)

    expect(result).toEqual({
      title: "2. Building a Better EPUB: Fundamental Accessibility",
      path: "EPUB/ch02.xhtml",
      subChapter: {
        title: "Getting Around: Navigating an EPUB",
        path: "EPUB/ch02s02.xhtml",
      },
    })
  })

  it("returns deep chapter info when href includes anchor (Page Numbering)", () => {
    const item = manifestB.spineItems.find((spineItem) =>
      spineItem.href.includes("ch02.xhtml"),
    )
    if (!item) throw new Error("expected spine item")

    const result = buildChaptersInfo(
      `${item.href}#_page_numbering`,
      toc,
      manifestB,
    )

    expect(result).toEqual({
      title: "2. Building a Better EPUB: Fundamental Accessibility",
      path: "EPUB/ch02.xhtml",
      subChapter: {
        title: "A Solid Foundation: Structure and Semantics",
        path: "EPUB/ch02.xhtml#_a_solid_foundation_structure_and_semantics",
        subChapter: {
          title: "Page Numbering",
          path: "EPUB/ch02.xhtml#_page_numbering",
        },
      },
    })
  })
})

describe("buildChaptersInfo (anchor-only toc href)", () => {
  const manifestWithAnchorOnlyHref: Manifest = {
    filename: "",
    items: [],
    readingDirection: "ltr",
    renditionLayout: "pre-paginated",
    renditionSpread: "auto",
    title: "",
    nav: {
      toc: [
        {
          title: "Chapter 1",
          href: "OPS/ch01.xhtml",
          path: "OPS/ch01.xhtml",
          contents: [
            {
              title: "Intro",
              href: "#intro",
              path: "OPS/ch01.xhtml#intro",
              contents: [],
            },
          ],
        },
        {
          title: "Chapter 2",
          href: "OPS/ch02.xhtml",
          path: "OPS/ch02.xhtml",
          contents: [],
        },
      ],
    },
    spineItems: [
      {
        href: "OPS/ch01.xhtml",
        id: "ch01",
        pageSpreadLeft: true,
        pageSpreadRight: true,
        progressionWeight: 0,
        renditionLayout: "reflowable",
        index: 0,
      },
      {
        href: "OPS/ch02.xhtml",
        id: "ch02",
        pageSpreadLeft: true,
        pageSpreadRight: true,
        progressionWeight: 0,
        renditionLayout: "reflowable",
        index: 1,
      },
    ],
  }

  it("resolves chapter chain when toc href is anchor-only", () => {
    const toc: NonNullable<Manifest["nav"]>["toc"] =
      manifestWithAnchorOnlyHref.nav?.toc ??
      ([] as NonNullable<Manifest["nav"]>["toc"])

    const result = buildChaptersInfo(
      "OPS/ch01.xhtml#intro",
      toc,
      manifestWithAnchorOnlyHref,
    )

    expect(result).toEqual({
      title: "Chapter 1",
      path: "OPS/ch01.xhtml",
      subChapter: {
        title: "Intro",
        path: "OPS/ch01.xhtml#intro",
      },
    })
  })
})
