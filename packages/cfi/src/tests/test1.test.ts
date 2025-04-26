import fs from "node:fs/promises"
import { describe, expect, it } from "vitest"
import { generate } from "../generate"
import { resolve } from "../resolve"

describe("test1.xhtml", () => {
  it("should correctly target text node", async () => {
    const domParser = new DOMParser()
    const test1Xhtml = await fs.readFile(`${__dirname}/test1.xhtml`, "utf-8")
    const doc = domParser.parseFromString(test1Xhtml, "application/xhtml+xml")

    // get the text node within the element with id I_sect1_d1e191
    const node = doc.getElementById("I_sect1_d1e191")?.childNodes[0]
    if (!node) {
      throw new Error("Node not found")
    }

    const cfi = generate(node)

    // this ends with /1 to indicate that it is the first child of the element
    expect(cfi).toBe("epubcfi(/4/2/2[I_sect1_d1e191]/1)")
    expect(generate({ node, offset: 5 })).toBe(
      "epubcfi(/4/2/2[I_sect1_d1e191]/1:5)",
    )

    // Verify it resolves back correctly
    const resolvedText = resolve(cfi, doc)
    const resolvedTextWithOffset = resolve(
      "epubcfi(/4/2/2[I_sect1_d1e191]/1:0)",
      doc,
    )

    expect(resolvedText.node).toBe(node)
    expect(resolvedTextWithOffset.node).toBe(node)
  })
})
