import { describe, expect, it } from "vitest"
import {
  OPF_NAMESPACE,
  opfNamespacedAttribute,
  opfNamespacePrefixes,
  xmlNamespaceScope,
} from "./opfNamespace"

const DC_NAMESPACE = "http://purl.org/dc/elements/1.1/"

describe("xmlNamespaceScope", () => {
  it("reads the declarations on an element", () => {
    expect(
      xmlNamespaceScope({
        "xmlns:pkg": OPF_NAMESPACE,
        "xmlns:dc": DC_NAMESPACE,
        id: "ignored",
      }),
    ).toEqual({ pkg: OPF_NAMESPACE, dc: DC_NAMESPACE })
  })

  it("inherits what an element does not redeclare", () => {
    expect(
      xmlNamespaceScope(
        { "xmlns:extra": DC_NAMESPACE },
        { pkg: OPF_NAMESPACE },
      ),
    ).toEqual({ pkg: OPF_NAMESPACE, extra: DC_NAMESPACE })
  })

  it("lets a descendant rebind a prefix its ancestor bound", () => {
    expect(
      xmlNamespaceScope({ "xmlns:pkg": DC_NAMESPACE }, { pkg: OPF_NAMESPACE }),
    ).toEqual({ pkg: DC_NAMESPACE })
  })

  it("leaves the inherited scope untouched", () => {
    const inherited = { pkg: OPF_NAMESPACE }

    xmlNamespaceScope({ "xmlns:pkg": DC_NAMESPACE }, inherited)

    expect(inherited).toEqual({ pkg: OPF_NAMESPACE })
  })

  it("ignores the default namespace, which binds no prefix", () => {
    expect(xmlNamespaceScope({ xmlns: OPF_NAMESPACE })).toEqual({})
  })
})

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
