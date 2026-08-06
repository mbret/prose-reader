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
    ).toEqual({
      renditionLayout: "pre-paginated",
      apple: {
        fixedLayout: true,
        options: [{ name: "fixed-layout", value: "true" }],
      },
    })
  })

  it("treats true case-insensitively with surrounding whitespace", () => {
    expect(
      resolveApple(
        metadataWithOptions([{ name: "fixed-layout", value: " TRUE " }]),
      ).renditionLayout,
    ).toBe("pre-paginated")
  })

  it("empty when displayOptions absent", () => {
    expect(resolveApple({ kind: "apple" })).toEqual({})
  })

  it("keeps unknown options in the apple corner without a renditionLayout", () => {
    expect(
      resolveApple(metadataWithOptions([{ name: "other", value: "x" }])),
    ).toEqual({
      apple: { options: [{ name: "other", value: "x" }] },
    })
  })

  it("normalizes fixed-layout false without promoting a layout", () => {
    expect(
      resolveApple(
        metadataWithOptions([{ name: "fixed-layout", value: "false" }]),
      ),
    ).toEqual({
      apple: {
        fixedLayout: false,
        options: [{ name: "fixed-layout", value: "false" }],
      },
    })
  })

  it("uses first matching fixed-layout name when duplicated", () => {
    const resolved = resolveApple(
      metadataWithOptions([
        { name: "fixed-layout", value: "false" },
        { name: "fixed-layout", value: "true" },
      ]),
    )

    expect(resolved.renditionLayout).toBeUndefined()
    expect(resolved.apple?.fixedLayout).toBe(false)
  })
})
