import { describe, expect, it } from "vitest"
import { tokenizeXmlSpaceSeparatedList } from "./tokenizeXmlSpaceSeparatedList"

describe("tokenizeXmlSpaceSeparatedList", () => {
  it("returns empty for undefined, blank, or whitespace-only", () => {
    expect(tokenizeXmlSpaceSeparatedList(undefined)).toEqual([])
    expect(tokenizeXmlSpaceSeparatedList("")).toEqual([])
    expect(tokenizeXmlSpaceSeparatedList("   \t\n")).toEqual([])
  })

  it("splits on runs of whitespace and drops empties", () => {
    expect(tokenizeXmlSpaceSeparatedList("  a  b\tc ")).toEqual(["a", "b", "c"])
  })
})
