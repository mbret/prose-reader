import { describe, expect, it } from "vitest"
import { googleBooksLookupFromInput } from "./identifier.ts"

describe("googleBooksLookupFromInput", () => {
  it("recognizes the dedicated Google Books volume id", () => {
    expect(
      googleBooksLookupFromInput({ googleBooksId: " zyTCAlFPjgYC " }),
    ).toEqual({
      id: "zyTCAlFPjgYC",
      identifier: { value: "zyTCAlFPjgYC", scheme: "GoogleBooks" },
    })
  })

  it("recognizes an authored generic identifier", () => {
    expect(
      googleBooksLookupFromInput({
        identifiers: [{ value: " zyTCAlFPjgYC ", scheme: "GoogleBooks" }],
      }),
    ).toEqual({
      id: "zyTCAlFPjgYC",
      identifier: { value: " zyTCAlFPjgYC ", scheme: "GoogleBooks" },
    })
  })

  it.each([
    "https://books.google.com/books?id=zyTCAlFPjgYC&printsec=frontcover",
    "https://books.google.fr/books/about/Dune.html?id=zyTCAlFPjgYC",
    "https://www.googleapis.com/books/v1/volumes/zyTCAlFPjgYC",
    "https://books.googleapis.com/books/v1/volumes/zyTCAlFPjgYC",
  ])("extracts the id from an official Google Books URL: %s", (value) => {
    expect(
      googleBooksLookupFromInput({
        identifiers: [{ value, scheme: "URL" }],
      }),
    ).toEqual({ id: "zyTCAlFPjgYC", identifier: { value, scheme: "URL" } })
  })

  it("does not reinterpret arbitrary identifiers or URLs", () => {
    expect(
      googleBooksLookupFromInput({
        identifiers: [
          { value: "zyTCAlFPjgYC" },
          { value: "https://example.com/books?id=zyTCAlFPjgYC", scheme: "URL" },
          {
            value: "https://books.google.evil.com/books?id=zyTCAlFPjgYC",
            scheme: "URL",
          },
          {
            value: "https://books.google.com/books?id=zyTCAlFPjgYC",
            scheme: "DOI",
          },
          { value: "not/a/volume", scheme: "GoogleBooks" },
        ],
      }),
    ).toBeUndefined()
  })
})
