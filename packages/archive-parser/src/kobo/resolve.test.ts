import { describe, expect, it } from "vitest"
import { resolveKobo } from "./resolve"

describe("resolveKobo", () => {
  it("renditionLayout only", () => {
    expect(
      resolveKobo({
        kind: "kobo",
        renditionLayout: "pre-paginated",
      }),
    ).toEqual({ renditionLayout: "pre-paginated" })
  })

  it("empty when no renditionLayout", () => {
    expect(resolveKobo({ kind: "kobo" })).toEqual({})
  })
})
