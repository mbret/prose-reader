import { describe, expect, it } from "vitest"
import type { AppleDisplayOption, AppleMetadata } from "./parse"
import { resolveApple } from "./resolve"

const metadataWithOptions = (
  options: ReadonlyArray<AppleDisplayOption>,
): AppleMetadata => ({
  kind: "apple",
  displayOptions: { platform: { options } },
})

describe("resolveApple", () => {
  it("maps fixed-layout true to pre-paginated renditionLayout", () => {
    expect(
      resolveApple(
        metadataWithOptions([{ name: "fixed-layout", value: "true" }]),
      ),
    ).toEqual({ renditionLayout: "pre-paginated" })
  })

  it("treats true case-insensitively with surrounding whitespace", () => {
    expect(
      resolveApple(
        metadataWithOptions([{ name: "fixed-layout", value: " TRUE " }]),
      ),
    ).toEqual({ renditionLayout: "pre-paginated" })
  })

  it("empty when displayOptions absent", () => {
    expect(resolveApple({ kind: "apple" })).toEqual({})
  })

  it("empty when fixed-layout option is absent", () => {
    expect(
      resolveApple(metadataWithOptions([{ name: "other", value: "x" }])),
    ).toEqual({})
  })

  it("empty when fixed-layout is not true", () => {
    expect(
      resolveApple(
        metadataWithOptions([{ name: "fixed-layout", value: "false" }]),
      ),
    ).toEqual({})
  })

  it("uses first matching fixed-layout name when duplicated", () => {
    expect(
      resolveApple(
        metadataWithOptions([
          { name: "fixed-layout", value: "false" },
          { name: "fixed-layout", value: "true" },
        ]),
      ),
    ).toEqual({})
  })
})
