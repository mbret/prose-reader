import { describe, expect, it } from "vitest"
import { parseContentType } from "./contentType"

describe("parseContentType", () => {
  it("should keep mime type without parameters", () => {
    expect(parseContentType("image/jpeg")).toBe("image/jpeg")
  })

  it("should remove parameters from mime type", () => {
    expect(parseContentType("text/html; charset=UTF-8")).toBe("text/html")
  })
})
