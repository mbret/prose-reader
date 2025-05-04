import fs from "node:fs/promises"
import { describe, expect, it } from "vitest"
import { generate } from "../generate"
import { resolve } from "../resolve"

describe("test2.xhtml", () => {
  it("should correctly target img node", async () => {
    const domParser = new DOMParser()
    const test1Xhtml = await fs.readFile(`${__dirname}/test2.xhtml`, "utf-8")
    const doc = domParser.parseFromString(test1Xhtml, "application/xhtml+xml")

    const imageNode = doc.body.childNodes[1]
    if (!imageNode) {
      throw new Error("Node not found")
    }

    const cfi = generate(imageNode)

    // this ends with /1 to indicate that it is the first child of the element
    expect(cfi).toBe("epubcfi(/4/2)")

    const resolvedText = resolve(cfi, doc)

    expect(resolvedText.node).toBe(imageNode)
  })
})
