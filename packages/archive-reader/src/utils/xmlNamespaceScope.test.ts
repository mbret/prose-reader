import { describe, expect, it } from "vitest"
import { xmlNamespaceScope } from "./xmlNamespaceScope"

const OPF_NAMESPACE = "http://www.idpf.org/2007/opf"
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
