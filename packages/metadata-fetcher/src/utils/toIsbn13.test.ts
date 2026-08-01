import { describe, expect, it } from "vitest"
import { toIsbn13 } from "./toIsbn13.ts"

describe("toIsbn13", () => {
  it("keeps an ISBN-13 as-is", () => {
    expect(toIsbn13("9780441013593")).toBe("9780441013593")
  })

  it("converts the ISBN-10 and ISBN-13 of the same book to one value", () => {
    expect(toIsbn13("0441013597")).toBe("9780441013593")
    // The Hitchhiker's Guide to the Galaxy, with an X check digit
    expect(toIsbn13("034539180X")).toBe("9780345391803")
  })

  it("recognizes the forms a human types", () => {
    expect(toIsbn13("978-0-441-01359-3")).toBe("9780441013593")
    expect(toIsbn13("ISBN 0-441-01359-7")).toBe("9780441013593")
    expect(toIsbn13("urn:isbn:9780441013593")).toBe("9780441013593")
    expect(toIsbn13("  0441013597  ")).toBe("9780441013593")
  })

  it("returns undefined for anything that is not an ISBN", () => {
    expect(toIsbn13("")).toBeUndefined()
    expect(toIsbn13("urn:uuid:1234")).toBeUndefined()
    expect(toIsbn13("12345")).toBeUndefined()
  })
})
