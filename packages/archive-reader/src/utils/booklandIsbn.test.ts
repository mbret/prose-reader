import { describe, expect, it } from "vitest"
import { booklandIsbn } from "./booklandIsbn.ts"

describe("booklandIsbn", () => {
  it("accepts an ISBN-13 in the Bookland range", () => {
    expect(booklandIsbn("978-0-441-01359-3")).toBe("9780441013593")
    expect(booklandIsbn("9791234567896")).toBe("9791234567896")
  })

  it("accepts an ISBN-10 on its length", () => {
    expect(booklandIsbn("0-441-01359-7")).toBe("0441013597")
    expect(booklandIsbn("034539180x")).toBe("034539180X")
  })

  it("rejects a 13-digit barcode outside the Bookland range", () => {
    expect(booklandIsbn("4006381333931")).toBeUndefined()
    expect(booklandIsbn("0036000291452")).toBeUndefined()
  })

  it("rejects a barcode of another GTIN length, ISBN-shaped prefix and all", () => {
    expect(booklandIsbn("036180592125")).toBeUndefined()
    expect(booklandIsbn("00971400005051")).toBeUndefined()
    expect(booklandIsbn("97800000000000")).toBeUndefined()
  })

  it("rejects values carrying no ISBN at all", () => {
    expect(booklandIsbn(undefined)).toBeUndefined()
    expect(booklandIsbn("")).toBeUndefined()
    expect(booklandIsbn("urn:uuid:0d3f0b3a")).toBeUndefined()
  })
})
