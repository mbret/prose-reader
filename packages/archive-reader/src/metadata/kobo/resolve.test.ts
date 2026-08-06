import { describe, expect, it } from "vitest"
import { resolveKobo } from "./resolve"

describe("resolveKobo", () => {
  it("renditionLayout with the kobo corner", () => {
    expect(
      resolveKobo({
        kind: "kobo",
        renditionLayout: "pre-paginated",
      }),
    ).toEqual({
      renditionLayout: "pre-paginated",
      kobo: { fixedLayout: true },
    })
  })

  it("empty when no renditionLayout", () => {
    expect(resolveKobo({ kind: "kobo" })).toEqual({})
  })
})
