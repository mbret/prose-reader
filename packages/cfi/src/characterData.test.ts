import { describe, expect, it } from "vitest"
import { generate } from "./generate"
import { resolve } from "./resolve"
import { isCharacterData } from "./utils"

/**
 * EPUB CFI 3.1.1: the character data between two element children forms one
 * chunk with an odd index (1 before the first element, 3 after it, ...),
 * whatever the DOM nodes it spans (adjacent text nodes, CDATA sections and
 * the comments between them), and a character offset counts from the start
 * of the chunk.
 */
const parseBody = (body: string) =>
  new DOMParser().parseFromString(
    `<html xmlns="http://www.w3.org/1999/xhtml"><head><title>t</title></head><body>${body}</body></html>`,
    "application/xhtml+xml",
  )

const paragraphOf = (document: Document) => {
  const paragraph = document.querySelector("p")

  if (!paragraph) throw new Error("no paragraph")

  return paragraph
}

const characterDataAt = (parent: Element, index: number): CharacterData => {
  const node = parent.childNodes[index]

  if (!node || !isCharacterData(node)) {
    throw new Error(`no character data at ${index}`)
  }

  return node
}

describe("character data steps", () => {
  describe("generate", () => {
    it("numbers the chunk after an element child with the next odd index", () => {
      const document = parseBody("<p>Hello <em>big</em> world</p>")
      const paragraph = paragraphOf(document)

      expect(generate({ node: characterDataAt(paragraph, 0), offset: 2 })).toBe(
        "epubcfi(/4/2/1:2)",
      )
      expect(generate({ node: characterDataAt(paragraph, 2), offset: 3 })).toBe(
        "epubcfi(/4/2/3:3)",
      )
    })

    it("gives text after a first element child the index 3, not the element's", () => {
      const document = parseBody("<p><em>x</em>after</p>")
      const paragraph = paragraphOf(document)

      expect(generate({ node: characterDataAt(paragraph, 1), offset: 2 })).toBe(
        "epubcfi(/4/2/3:2)",
      )
      expect(generate(characterDataAt(paragraph, 1))).toBe("epubcfi(/4/2/3)")
    })

    it("counts every element before the chunk", () => {
      const document = parseBody("<p>a<b>b</b>c<i>d</i>e</p>")
      const paragraph = paragraphOf(document)

      expect(generate({ node: characterDataAt(paragraph, 4), offset: 1 })).toBe(
        "epubcfi(/4/2/5:1)",
      )
    })

    it("counts the offset from the start of the chunk across adjacent text nodes", () => {
      const document = parseBody("<p>ab</p>")
      const paragraph = paragraphOf(document)
      const second = document.createTextNode("cd")
      paragraph.appendChild(second)

      expect(generate({ node: second, offset: 1 })).toBe("epubcfi(/4/2/1:3)")
    })

    it("ignores a comment inside a chunk", () => {
      const document = parseBody("<p>ab<!-- note -->cd</p>")
      const paragraph = paragraphOf(document)

      expect(paragraph.childNodes.length).toBe(3)
      expect(generate({ node: characterDataAt(paragraph, 2), offset: 1 })).toBe(
        "epubcfi(/4/2/1:3)",
      )
    })

    it("treats a CDATA section as character data", () => {
      const document = parseBody("<p><![CDATA[ab]]>cd</p>")
      const paragraph = paragraphOf(document)

      expect(characterDataAt(paragraph, 0).nodeType).toBe(
        Node.CDATA_SECTION_NODE,
      )
      expect(generate({ node: characterDataAt(paragraph, 0), offset: 1 })).toBe(
        "epubcfi(/4/2/1:1)",
      )
      expect(generate({ node: characterDataAt(paragraph, 1), offset: 0 })).toBe(
        "epubcfi(/4/2/1:2)",
      )
    })

    it("writes range offsets from the start of the chunk", () => {
      const document = parseBody("<p>ab<!-- note -->cd</p>")
      const paragraph = paragraphOf(document)
      const second = characterDataAt(paragraph, 2)

      expect(
        generate({
          start: { node: second, offset: 0 },
          end: { node: second, offset: 2 },
        }),
      ).toBe("epubcfi(/4/2/1,:2,:4)")
      expect(
        generate({
          start: { node: characterDataAt(paragraph, 0), offset: 1 },
          end: { node: second, offset: 1 },
        }),
      ).toBe("epubcfi(/4/2,/1:1,/1:3)")
    })
  })

  describe("resolve", () => {
    it("resolves the chunk after an element child to its text node", () => {
      const document = parseBody("<p>First<em>Emphasized</em>Last</p>")
      const paragraph = paragraphOf(document)

      const first = resolve("epubcfi(/4/2/1:2)", document)
      expect(first.node).toBe(characterDataAt(paragraph, 0))
      expect(first.offset).toBe(2)

      const last = resolve("epubcfi(/4/2/3:2)", document)
      expect(last.node).toBe(characterDataAt(paragraph, 2))
      expect(last.offset).toBe(2)
    })

    it("lands an offset in the adjacent text node it falls in", () => {
      const document = parseBody("<p>ab<!-- note -->cd</p>")
      const paragraph = paragraphOf(document)

      const inside = resolve("epubcfi(/4/2/1:3)", document)
      expect(inside.node).toBe(characterDataAt(paragraph, 2))
      expect(inside.offset).toBe(1)

      const boundary = resolve("epubcfi(/4/2/1:2)", document)
      expect(boundary.node).toBe(characterDataAt(paragraph, 2))
      expect(boundary.offset).toBe(0)

      const end = resolve("epubcfi(/4/2/1:4)", document)
      expect(end.node).toBe(characterDataAt(paragraph, 2))
      expect(end.offset).toBe(2)
    })

    it("resolves into a CDATA section", () => {
      const document = parseBody("<p><![CDATA[ab]]>cd</p>")
      const paragraph = paragraphOf(document)

      const result = resolve("epubcfi(/4/2/1:1)", document)
      expect(result.node).toBe(characterDataAt(paragraph, 0))
      expect(result.offset).toBe(1)
    })

    it("has no node for an empty chunk", () => {
      const document = parseBody("<p><em>x</em></p>")

      expect(resolve("epubcfi(/4/2/3:0)", document).node).toBeNull()
      expect(() =>
        resolve("epubcfi(/4/2/3:0)", document, { throwOnError: true }),
      ).toThrow()
    })

    it("builds ranges with chunk offsets", () => {
      const document = parseBody("<p>ab<!-- note -->cd</p>")
      const paragraph = paragraphOf(document)

      const asRange = resolve("epubcfi(/4/2/1:3)", document, { asRange: true })
      expect(asRange.node?.startContainer).toBe(characterDataAt(paragraph, 2))
      expect(asRange.node?.startOffset).toBe(1)

      for (const cfi of ["epubcfi(/4/2/1,:1,:3)", "epubcfi(/4/2,/1:1,/1:3)"]) {
        const range = resolve(cfi, document)

        expect(range.isRange).toBe(true)

        if (!(range.node instanceof Range)) throw new Error("no range")

        expect(range.node.startContainer).toBe(characterDataAt(paragraph, 0))
        expect(range.node.startOffset).toBe(1)
        expect(range.node.endContainer).toBe(characterDataAt(paragraph, 2))
        expect(range.node.endOffset).toBe(1)
        expect(range.node.toString()).toBe("bc")
      }
    })
  })

  describe("round trip", () => {
    it("takes text after element children back to the same node", () => {
      const document = parseBody(
        "<p>Hello <em>big</em> world, <b>again</b> and again</p>",
      )
      const paragraph = paragraphOf(document)
      const cases: [number, number][] = [
        [0, 3],
        [2, 1],
        [4, 5],
      ]

      for (const [index, offset] of cases) {
        const node = characterDataAt(paragraph, index)
        const result = resolve(generate({ node, offset }), document)

        expect(result.node).toBe(node)
        expect(result.offset).toBe(offset)
      }
    })

    it("takes a range crossing an element child back to the same boundaries", () => {
      const document = parseBody("<p><em>x</em>after<!-- note -->math</p>")
      const paragraph = paragraphOf(document)
      const start = characterDataAt(paragraph, 1)
      const end = characterDataAt(paragraph, 3)

      const cfi = generate({
        start: { node: start, offset: 2 },
        end: { node: end, offset: 2 },
      })
      expect(cfi).toBe("epubcfi(/4/2,/3:2,/3:7)")

      const result = resolve(cfi, document)

      if (!(result.node instanceof Range)) throw new Error("no range")

      expect(result.node.startContainer).toBe(start)
      expect(result.node.startOffset).toBe(2)
      expect(result.node.endContainer).toBe(end)
      expect(result.node.endOffset).toBe(2)
      expect(result.node.toString()).toBe("terma")
    })
  })
})
