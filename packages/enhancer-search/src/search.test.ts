// @vitest-environment jsdom
import { describe, expect, it } from "vitest"
import { searchTextRangesInNode } from "./search"

const createDocument = (bodyHtml: string) => {
  const doc = document.implementation.createHTMLDocument()
  doc.body.innerHTML = bodyHtml

  return doc
}

const searchMatchedTexts = (bodyHtml: string, text: string) =>
  searchTextRangesInNode(createDocument(bodyHtml), text).map((range) =>
    range.toString(),
  )

describe("searchTextRangesInNode", () => {
  it.each([
    { text: `s.me`, bodyHtml: `<p>some s.me</p>`, expected: [`s.me`] },
    { text: `C++`, bodyHtml: `<p>C and C++ and CC</p>`, expected: [`C++`] },
    { text: `f(`, bodyHtml: `<p>f() or f</p>`, expected: [`f(`] },
    { text: `a|b`, bodyHtml: `<p>a b a|b and so on</p>`, expected: [`a|b`] },
  ])("matches $text literally", ({ text, bodyHtml, expected }) => {
    expect(searchMatchedTexts(bodyHtml, text)).toEqual(expected)
  })

  it.each([`a?`, `|`, `e*`])(
    "completes on %s, which a RegExp could match empty",
    (text) => {
      expect(searchMatchedTexts(`<p>a? | e* aaa eee</p>`, text)).toEqual([text])
    },
  )

  it("gives each range the length of its match", () => {
    expect(searchMatchedTexts(`<p>x.? and x. and xyz</p>`, `x.?`)).toEqual([
      `x.?`,
    ])
  })

  it("covers exactly each match, even where lowercasing changes the length", () => {
    // `İ` lowercases to two code units, shifting every later offset by one in
    // a lowercased copy of the text.
    const doc = createDocument(`<p>İstanbul and more to read</p>`)
    const textNode = doc.body.firstChild?.firstChild

    const ranges = searchTextRangesInNode(doc, `more`)

    expect(ranges).toHaveLength(1)
    expect(ranges[0]?.startContainer).toBe(textNode)
    expect(ranges[0]?.startOffset).toBe(`İstanbul and `.length)
    expect(ranges[0]?.endOffset).toBe(`İstanbul and more`.length)
    expect(ranges[0]?.toString()).toBe(`more`)
  })

  it("matches case-insensitively, within one text node, whitespace as written", () => {
    expect(
      searchMatchedTexts(
        `<p>Hello hello HELLO</p><p>hel<b>lo</b></p><p>hello  world hello world</p>`,
        `hello world`,
      ),
    ).toEqual([`hello world`])
    expect(searchMatchedTexts(`<p>Hello hello HELLO</p>`, `hello`)).toEqual([
      `Hello`,
      `hello`,
      `HELLO`,
    ])
  })

  it("ignores the head", () => {
    const doc = createDocument(`<p>needle</p>`)
    doc.title = `needle`

    expect(
      searchTextRangesInNode(doc, `needle`).map((range) => range.toString()),
    ).toEqual([`needle`])
  })

  it("finds nothing for an empty text", () => {
    expect(searchMatchedTexts(`<p>anything</p>`, ``)).toEqual([])
  })
})
