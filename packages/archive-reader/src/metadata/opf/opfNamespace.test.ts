import { describe, expect, it } from "vitest"
import {
  OPF_NAMESPACE,
  opfNamespacedAttribute,
  opfNamespacePrefixes,
} from "./opfNamespace"

describe("opfNamespacePrefixes", () => {
  it("always accepts the conventional prefix", () => {
    expect(opfNamespacePrefixes({})).toEqual(["opf"])
  })

  it("collects every prefix bound to the OPF namespace", () => {
    expect(
      opfNamespacePrefixes({
        "xmlns:pkg": OPF_NAMESPACE,
        "xmlns:p2": ` ${OPF_NAMESPACE} `,
      }),
    ).toEqual(["opf", "pkg", "p2"])
  })

  it("does not repeat the conventional prefix when it is declared", () => {
    expect(opfNamespacePrefixes({ "xmlns:opf": OPF_NAMESPACE })).toEqual([
      "opf",
    ])
  })

  it("ignores prefixes bound elsewhere, and the default namespace", () => {
    expect(
      opfNamespacePrefixes({
        "xmlns:dc": "http://purl.org/dc/elements/1.1/",
        xmlns: OPF_NAMESPACE,
      }),
    ).toEqual(["opf"])
  })
})

describe("opfNamespacedAttribute", () => {
  const prefixes = ["opf", "pkg"]

  it("prefers a prefixed spelling over the unprefixed fallback", () => {
    expect(
      opfNamespacedAttribute(
        { "pkg:scheme": "ISBN", scheme: "GTIN" },
        prefixes,
        ["scheme"],
      ),
    ).toBe("ISBN")
  })

  it("tries each local name across every prefix before falling back", () => {
    expect(
      opfNamespacedAttribute({ "pkg:Scheme": "ISBN" }, prefixes, [
        "scheme",
        "Scheme",
      ]),
    ).toBe("ISBN")
    expect(
      opfNamespacedAttribute({ scheme: "ISBN" }, prefixes, [
        "scheme",
        "Scheme",
      ]),
    ).toBe("ISBN")
  })

  it("declines an attribute under no accepted prefix", () => {
    expect(
      opfNamespacedAttribute({ "other:scheme": "ISBN" }, prefixes, ["scheme"]),
    ).toBeUndefined()
  })
})
