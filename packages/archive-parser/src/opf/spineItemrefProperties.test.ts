import { describe, expect, it } from "vitest"
import { layoutHintsFromItemrefProperties } from "./spineItemrefProperties"

describe("layoutHintsFromItemrefProperties", () => {
  it("returns empty for undefined or blank", () => {
    expect(layoutHintsFromItemrefProperties(undefined)).toEqual({})
    expect(layoutHintsFromItemrefProperties("  ")).toEqual({})
  })

  it("parses rendition layout tokens", () => {
    expect(
      layoutHintsFromItemrefProperties(
        `rendition:layout-pre-paginated page-spread-left`,
      ),
    ).toEqual({
      renditionLayout: `pre-paginated`,
      pageSpreadLeft: true,
    })
  })

  it("pre-paginated wins over reflowable when both appear", () => {
    expect(
      layoutHintsFromItemrefProperties(
        `rendition:layout-reflowable rendition:layout-pre-paginated`,
      ),
    ).toEqual({ renditionLayout: `pre-paginated` })
  })
})
