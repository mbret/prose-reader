import { describe, expect, it } from "vitest"
import { isKeyOf, truncateText } from "./utils"

describe("truncateText", () => {
  it("returns the original text when it is within the limit", () => {
    expect(truncateText("hello", 5)).toBe("hello")
    expect(truncateText("hello", 10)).toBe("hello")
  })

  it("truncates text that exceeds the limit", () => {
    expect(truncateText("abcdefghijklmnopqrstuvwxyz", 5)).toBe("abcde...")
  })
})

describe("isKeyOf", () => {
  it("accepts the record's own keys only", () => {
    const labels = { auto: "Automatic", never: "Never" }

    expect(
      ["auto", "never", "always", "toString"].filter((value) =>
        isKeyOf(labels, value),
      ),
    ).toEqual(["auto", "never"])
  })
})
