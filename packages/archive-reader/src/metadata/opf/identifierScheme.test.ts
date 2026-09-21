import { describe, expect, it } from "vitest"
import {
  OPF_IDENTIFIER_SCHEME_ATTRIBUTES,
  opfIdentifierSchemeAttribute,
  opfIdentifierTypeScheme,
} from "./identifierScheme"

describe("opfIdentifierTypeScheme", () => {
  it("translates an ONIX codelist 5 code", () => {
    expect(
      opfIdentifierTypeScheme({ value: "15", scheme: "onix:codelist5" }),
    ).toBe("ISBN")
    expect(
      opfIdentifierTypeScheme({ value: "06", scheme: " ONIX:CodeList5 " }),
    ).toBe("DOI")
  })

  it("passes a code the list does not define through verbatim", () => {
    expect(
      opfIdentifierTypeScheme({ value: "99", scheme: "onix:codelist5" }),
    ).toBe("99")
  })

  it("treats a value stated against no scheme as a scheme name", () => {
    expect(opfIdentifierTypeScheme({ value: " DOI " })).toBe("DOI")
    expect(opfIdentifierTypeScheme({ value: "15" })).toBe("15")
    expect(
      opfIdentifierTypeScheme({ value: "ExampleCatalog", scheme: "other" }),
    ).toBe("ExampleCatalog")
  })

  it("declines an absent or blank value", () => {
    expect(opfIdentifierTypeScheme(undefined)).toBeUndefined()
    expect(opfIdentifierTypeScheme({})).toBeUndefined()
    expect(
      opfIdentifierTypeScheme({ value: "   ", scheme: "onix:codelist5" }),
    ).toBeUndefined()
  })
})

describe("opfIdentifierSchemeAttribute", () => {
  it("prefers the namespaced spelling", () => {
    expect(
      opfIdentifierSchemeAttribute({
        "opf:scheme": "ISBN",
        "opf:Scheme": "GTIN",
        scheme: "DOI",
      }),
    ).toBe("ISBN")
  })

  it("falls through the accepted spellings in order", () => {
    expect(
      opfIdentifierSchemeAttribute({ "opf:Scheme": "GTIN", scheme: "DOI" }),
    ).toBe("GTIN")
    expect(opfIdentifierSchemeAttribute({ scheme: "DOI" })).toBe("DOI")
  })

  it("declines an element stating none of them", () => {
    expect(opfIdentifierSchemeAttribute({})).toBeUndefined()
    expect(opfIdentifierSchemeAttribute({ id: "pub-id" })).toBeUndefined()
  })

  it("reads every spelling the vocabulary lists", () => {
    for (const name of OPF_IDENTIFIER_SCHEME_ATTRIBUTES) {
      expect(opfIdentifierSchemeAttribute({ [name]: "ISBN" })).toBe("ISBN")
    }
  })
})

describe("OPF_IDENTIFIER_SCHEME_ATTRIBUTES", () => {
  it("cannot be mutated by a consumer", () => {
    expect(Object.isFrozen(OPF_IDENTIFIER_SCHEME_ATTRIBUTES)).toBe(true)
    expect(() =>
      (OPF_IDENTIFIER_SCHEME_ATTRIBUTES as string[]).reverse(),
    ).toThrow()
    expect(opfIdentifierSchemeAttribute({ "opf:scheme": "ISBN" })).toBe("ISBN")
  })
})
