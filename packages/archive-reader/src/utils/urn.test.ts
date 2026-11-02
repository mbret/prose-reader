import { describe, expect, it } from "vitest"
import { parseUrn } from "./urn.ts"

describe("parseUrn", () => {
  it("splits a URN into its namespace and its name there", () => {
    expect(parseUrn("urn:nbn:de:101:1-2011")).toEqual({
      namespaceIdentifier: "nbn",
      namespaceSpecificString: "de:101:1-2011",
    })
  })

  it("lowers the case of the namespace, and only of it", () => {
    expect(parseUrn(" URN:ISSN:0167-6423 ")).toEqual({
      namespaceIdentifier: "issn",
      namespaceSpecificString: "0167-6423",
    })
    expect(parseUrn("urn:example:CaseMatters")?.namespaceSpecificString).toBe(
      "CaseMatters",
    )
  })

  it("leaves out the components RFC 8141 does not compare", () => {
    expect(parseUrn("urn:example:a123,z456?+r?=q#f")).toEqual({
      namespaceIdentifier: "example",
      namespaceSpecificString: "a123,z456",
    })
  })

  it("keeps percent-encoding and the characters a URN path allows", () => {
    expect(parseUrn("urn:example:a%2Fb/c:d@e")?.namespaceSpecificString).toBe(
      "a%2Fb/c:d@e",
    )
  })

  it("declines what RFC 8141 does not call a URN", () => {
    for (const value of [
      "urn:",
      "urn:uuid:",
      "urn:x:catalog",
      "urn:-uuid:abc",
      "urn:example:%zz",
      "urn:example:[x]",
      "urn:example:💩",
      "urn:example:a?b",
      "https://example.com/urn:example:a",
    ]) {
      expect(parseUrn(value)).toBeUndefined()
    }
  })
})
