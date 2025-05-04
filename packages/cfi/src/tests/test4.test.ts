import fs from "node:fs/promises"
import { describe, expect, it } from "vitest"
import { resolve } from "../resolve"

describe("Given a document with whitespace nodes", () => {
  it("should correctly target a node in a document which contains whitespace child nodes", async () => {
    const domParser = new DOMParser()
    const test1Xhtml = await fs.readFile(`${__dirname}/test4.xhtml`, "utf-8")
    const doc = domParser.parseFromString(test1Xhtml, "application/xhtml+xml")

    const cfi = "epubcfi(/4/4[toc]/4/8/4/2/4/2/2/1)"

    const resolved = resolve(cfi, doc)

    if (!(resolved.node instanceof Node)) throw new Error("Invalid node")

    expect(resolved.node.textContent).not.toBe(`\n\t\t\t`)
    expect(resolved.node?.textContent).toBe("Timed Tracks")
  })
})
