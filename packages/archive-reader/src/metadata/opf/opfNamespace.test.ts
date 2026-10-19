import { describe, expect, it } from "vitest"
import {
  OPF_NAMESPACE,
  opfNamespacedAttribute,
  opfNamespacePrefixes,
} from "./opfNamespace"

const DC_NAMESPACE = "http://purl.org/dc/elements/1.1/"

describe("opfNamespacePrefixes", () => {
  it("accepts the conventional prefix when nothing binds it", () => {
    expect(opfNamespacePrefixes({})).toEqual(["opf"])
    expect(opfNamespacePrefixes({ dc: DC_NAMESPACE })).toEqual(["opf"])
  })

  it("collects every prefix naming the OPF namespace", () => {
    expect(
      opfNamespacePrefixes({ pkg: OPF_NAMESPACE, p2: OPF_NAMESPACE }),
    ).toEqual(["opf", "pkg", "p2"])
  })

  it("does not repeat the conventional prefix when it is declared", () => {
    expect(opfNamespacePrefixes({ opf: OPF_NAMESPACE })).toEqual(["opf"])
  })

  it("honours a document that rebinds the conventional prefix elsewhere", () => {
    expect(opfNamespacePrefixes({ opf: DC_NAMESPACE })).toEqual([])
    expect(
      opfNamespacePrefixes({ opf: DC_NAMESPACE, pkg: OPF_NAMESPACE }),
    ).toEqual(["pkg"])
  })

  it("ignores prefixes bound elsewhere", () => {
    expect(opfNamespacePrefixes({ dc: DC_NAMESPACE })).toEqual(["opf"])
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

  it("declines everything when no prefix names the namespace", () => {
    expect(
      opfNamespacedAttribute({ "opf:scheme": "ISBN" }, [], ["scheme"]),
    ).toBeUndefined()
  })
})
