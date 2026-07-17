import { describe, expect, it } from "vitest"
import {
  createUniqueXmlSafeId,
  createXmlSafeId,
  createXmlSafeIdFactory,
} from "./createXmlSafeId"

const generatedIdPattern = /^[A-Za-z0-9_][A-Za-z0-9_.-]*$/

describe("createXmlSafeId", () => {
  it("should keep already safe XML IDs unchanged", () => {
    expect(createXmlSafeId("page_1.jpeg")).toBe("page_1.jpeg")
  })

  it("should sanitize paths and values that cannot be XML IDs", () => {
    const id = createXmlSafeId("Chapter 1/page_1.jpg")

    expect(id).toMatch(generatedIdPattern)
    expect(id).toBe("Chapter_1_page_1.jpg")
  })

  it("should preserve values starting with a number", () => {
    expect(createXmlSafeId("0004~0005.png")).toBe("0004_0005.png")
  })

  it("should avoid XML-reserved prefixes", () => {
    expect(createXmlSafeId("xml-cover.jpg")).toBe("_xml-cover.jpg")
  })

  it("should keep sanitized IDs readable", () => {
    expect(createXmlSafeId("p006-007 [dig] [Seven Seas] {HQ}.jpg.006")).toBe(
      "p006-007_dig_Seven_Seas_HQ_.jpg.006",
    )
  })
})

describe("createUniqueXmlSafeId", () => {
  it("should disambiguate sanitized ID collisions", () => {
    const usedIds = new Set<string>()

    expect(createUniqueXmlSafeId("Chapter 1/page.jpg", usedIds)).toBe(
      "Chapter_1_page.jpg",
    )
    expect(createUniqueXmlSafeId("Chapter_1/page.jpg", usedIds)).toBe(
      "Chapter_1_page.jpg-2",
    )
  })
})

describe("createXmlSafeIdFactory", () => {
  it("should keep ID state across calls", () => {
    const createSafeId = createXmlSafeIdFactory()

    expect(createSafeId("Chapter 1/page.jpg")).toBe("Chapter_1_page.jpg")
    expect(createSafeId("Chapter_1/page.jpg")).toBe("Chapter_1_page.jpg-2")
  })
})
