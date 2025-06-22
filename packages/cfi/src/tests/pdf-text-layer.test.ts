import fs from "node:fs/promises"
import { describe, expect, it } from "vitest"
import { generate } from "../generate"
import { parse } from "../parse"
import { resolve } from "../resolve"

describe("Given a pdf text layer document", () => {
  it("should resolve a range for a single text node", async () => {
    const domParser = new DOMParser()
    const test1Xhtml = await fs.readFile(
      `${__dirname}/pdf-text-layer.html`,
      "utf-8",
    )
    const doc = domParser.parseFromString(test1Xhtml, "application/xhtml+xml")

    const cfi = "epubcfi(/6/4[1]!/4/2/26/1,:9,:25)"

    const parsedCfi = parse(cfi)

    expect(parsedCfi).toEqual({
      parent: [
        [
          {
            index: 6,
          },
          {
            index: 4,
            id: "1",
          },
        ],
        [
          {
            index: 4,
          },
          {
            index: 2,
          },
          {
            index: 26,
          },
          {
            index: 1,
          },
        ],
      ],
      start: [
        [
          {
            index: 4,
          },
          {
            index: 2,
          },
          {
            index: 26,
          },
          {
            index: 1,
            offset: 9,
          },
        ],
      ],
      end: [
        [
          {
            index: 4,
          },
          {
            index: 2,
          },
          {
            index: 26,
          },
          {
            index: 1,
            offset: 25,
          },
        ],
      ],
    })

    const resolved = resolve(cfi, doc)

    if (!(resolved.node instanceof Range)) throw new Error("Invalid range")

    expect(resolved.node?.startContainer.nodeType).toBe(Node.TEXT_NODE)
    expect(resolved.node?.endContainer.nodeType).toBe(Node.TEXT_NODE)
    expect(resolved.node?.startOffset).toBe(9)
    expect(resolved.node?.endOffset).toBe(25)
    expect(resolved.node?.toString()).toBe("m soluta nobis e")
  })

  it("should resolve a range for spreading on two text nodes", async () => {
    const domParser = new DOMParser()
    const test1Xhtml = await fs.readFile(
      `${__dirname}/pdf-text-layer.html`,
      "utf-8",
    )
    const doc = domParser.parseFromString(test1Xhtml, "application/xhtml+xml")

    const firstSpan = doc.querySelector("span[data-id='1']")
    const secondSpan = doc.querySelector("span[data-id='2']")

    expect(firstSpan).not.toBeNull()
    expect(secondSpan).not.toBeNull()

    const firstTextNode = firstSpan?.firstChild
    const secondTextNode = secondSpan?.firstChild

    expect(firstTextNode?.nodeType).toBe(Node.TEXT_NODE)
    expect(secondTextNode?.nodeType).toBe(Node.TEXT_NODE)

    const cfi = generate({
      start: {
        // biome-ignore lint/style/noNonNullAssertion: <explanation>
        node: firstTextNode!,
        offset: 28,
      },
      end: {
        // biome-ignore lint/style/noNonNullAssertion: <explanation>
        node: secondTextNode!,
        offset: 33,
      },
    })

    expect(cfi).toBe("epubcfi(/4/2,/6/1:28,/10/1:33)")

    const resolved = resolve(cfi, doc, {
      throwOnError: true,
    })

    if (!(resolved.node instanceof Range)) throw new Error("Invalid range")

    expect(resolved.node?.startContainer).toBe(firstTextNode)
    expect(resolved.node?.endContainer).toBe(secondTextNode)
    expect(resolved.node?.startOffset).toBe(28)
    expect(resolved.node?.endOffset).toBe(33)
    expect(resolved.node?.toString()).toBe(
      `consectetuer adipiscing elit, sed diam nonummy nibh euismodtincidunt ut laoreet dolore magna`,
    )
  })

  it("should resolve a valid range CFI that contains an indirection", async () => {
    const domParser = new DOMParser()
    const test1Xhtml = await fs.readFile(
      `${__dirname}/pdf-text-layer.html`,
      "utf-8",
    )
    const doc = domParser.parseFromString(test1Xhtml, "application/xhtml+xml")
    const firstSpan = doc.querySelector("span[data-id='1']")
    const secondSpan = doc.querySelector("span[data-id='2']")
    const firstTextNode = firstSpan?.firstChild
    const secondTextNode = secondSpan?.firstChild

    const resolved = resolve("epubcfi(/6/4[1]!/4/2,/6/1:28,/10/1:33)", doc, {
      throwOnError: true,
    })

    if (!(resolved.node instanceof Range)) throw new Error("Invalid range")

    expect(resolved.node?.startContainer).toBe(firstTextNode)
    expect(resolved.node?.endContainer).toBe(secondTextNode)
    expect(resolved.node?.startOffset).toBe(28)
    expect(resolved.node?.endOffset).toBe(33)
    expect(resolved.node?.toString()).toBe(
      `consectetuer adipiscing elit, sed diam nonummy nibh euismodtincidunt ut laoreet dolore magna`,
    )
  })
})
