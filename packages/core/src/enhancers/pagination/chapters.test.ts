import type { Manifest } from "@prose-reader/shared"
import { describe, expect, it } from "vitest"
import { buildChaptersInfo } from "./chapters"
import templateManifest from "./tests/chapters-template-a.json"

const manifest = templateManifest as unknown as Manifest

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
