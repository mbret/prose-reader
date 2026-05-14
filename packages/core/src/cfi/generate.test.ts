// @vitest-environment happy-dom
import type { Manifest } from "@prose-reader/shared"
import { describe, expect, it } from "vitest"
import { generateCfiForSpineItemPage, generateRootCfi } from "./generate"

describe("generateRootCfi", () => {
  it("should generate a root cfi", () => {
    const cfi = generateRootCfi({
      id: "item1",
      href: "item1.html",
      index: 1,
    } as unknown as Manifest["spineItems"][number])

    expect(cfi).toBe("epubcfi(/6/4[item1]!)")
  })
})

describe("generateCfiForSpineItemPage", () => {
  const createSpreadDocument = () => {
    const parser = new DOMParser()

    return parser.parseFromString(
      `<html xmlns="http://www.w3.org/1999/xhtml">
        <head></head>
        <body><div><img id="spread-image" src="spread.jpg" alt="" /></div></body>
      </html>`,
      "application/xhtml+xml",
    )
  }

  const spreadSpineItem: Manifest["spineItems"][number] = {
    id: "1.spread.jpg",
    href: "wrapper.xhtml",
    index: 1,
    renditionLayout: "reflowable",
    renditionFlow: "paginated",
  }

  it("should generate a precise spatial CFI for the left-to-right first spread half", () => {
    const doc = createSpreadDocument()

    expect(
      generateCfiForSpineItemPage({
        spineItem: spreadSpineItem,
        pageNode: { node: doc.body, offset: 0 },
        pageIndex: 0,
        readingDirection: "ltr",
      }),
    ).toBe("epubcfi(/6/4[1.spread.jpg]!/4/2/2[spread-image]@25:50)")
  })

  it("should reverse spread spatial offsets for right-to-left reading", () => {
    const doc = createSpreadDocument()

    expect(
      generateCfiForSpineItemPage({
        spineItem: spreadSpineItem,
        pageNode: { node: doc.body, offset: 0 },
        pageIndex: 0,
        readingDirection: "rtl",
      }),
    ).toBe("epubcfi(/6/4[1.spread.jpg]!/4/2/2[spread-image]@75:50)")
  })
})
