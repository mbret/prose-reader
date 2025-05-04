import { describe, expect, it } from "vitest"
import { isRootCfi } from "../cfi/parse"

describe("isRootCfi", () => {
  it("should return false for a root CFI", () => {
    const cfi = "epubcfi(/4[body01]/10[para05]/2:3[Hello,World])"

    expect(isRootCfi(cfi)).toBe(false)
  })

  it("should return true for a non-root CFI", () => {
    expect(isRootCfi("epubcfi(/0)")).toBe(true)
    expect(isRootCfi("epubcfi(/0[;vnd.prose.anchor=16])")).toBe(true)
  })
})
