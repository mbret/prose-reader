import type { Reader, SpineItem } from "@prose-reader/core"
import { firstValueFrom } from "rxjs"
import { describe, expect, it } from "vitest"
import { searchInDocument } from "./search"

// The real Reader/SpineItem are irrelevant here: searchInDocument only calls
// reader.cfi.generateCfiFromRange with the ranges it found, so we echo the
// range boundaries back as the "cfi" to assert on them.
const reader = {
  cfi: {
    generateCfiFromRange: (range: Range) =>
      `${(range.startContainer as Text).data.slice(range.startOffset, range.endOffset)}@${range.startOffset}`,
  },
  // biome-ignore lint/suspicious/noExplicitAny: minimal stub for test
} as any as Reader

// biome-ignore lint/suspicious/noExplicitAny: minimal stub for test
const item = {} as any as SpineItem

const createDoc = (body: string) =>
  new DOMParser().parseFromString(
    `<html><body>${body}</body></html>`,
    "text/html",
  )

const search = (doc: Document, text: string) =>
  firstValueFrom(searchInDocument(reader, item, doc, text))

describe("searchInDocument", () => {
  it("treats the query as literal text when it contains regex special characters", async () => {
    const doc = createDoc(`<p>I love c++ and c# equally</p>`)

    const results = await search(doc, "c++")

    expect(results).toEqual([{ cfi: "c++@7" }])
  })

  it("does not treat regex metacharacters as wildcards", async () => {
    const doc = createDoc(`<p>cat cut c.t</p>`)

    const results = await search(doc, "c.t")

    expect(results).toEqual([{ cfi: "c.t@8" }])
  })

  it("anchors the range to the actual match boundaries", async () => {
    const doc = createDoc(`<p>this is the (end) of it</p>`)

    const results = await search(doc, "the (end)")

    expect(results).toEqual([{ cfi: "the (end)@8" }])
  })

  it("matches case-insensitively across nested elements", async () => {
    const doc = createDoc(`<p>Whale ahead!</p><p>a <b>whale</b> of a time</p>`)

    const results = await search(doc, "whale")

    expect(results).toEqual([{ cfi: "Whale@0" }, { cfi: "whale@0" }])
  })

  it("matches characters through Unicode simple case folding", async () => {
    // U+212A KELVIN SIGN case-folds to "k" only under Unicode folding, which
    // the `u` flag enables.
    const doc = createDoc(`<p>300K</p>`)

    const results = await search(doc, "k")

    expect(results).toEqual([{ cfi: "K@3" }])
  })

  it("computes offsets against the original text, not its lowercased form", async () => {
    // "İ".toLowerCase() expands to two code units, which used to shift every
    // subsequent match index and push ranges out of bounds.
    const doc = createDoc(`<p>İstanbul is big</p>`)

    const results = await search(doc, "big")

    expect(results).toEqual([{ cfi: "big@12" }])
  })
})
