import { describe, expect, it } from "vitest"
import { isRootCfi } from "../cfi/parse"

describe("isRootCfi", () => {
  it("should return false for a non-root CFI", () => {
    expect(isRootCfi("epubcfi(/4[body01]/10[para05]/2:3[Hello,World])")).toBe(
      false,
    )
    expect(isRootCfi("epubcfi(/6/2!/4/10/2)")).toBe(false)
  })

  it("should return true for a root CFI", () => {
    expect(isRootCfi("epubcfi(/6/2)")).toBe(true)
  })
})
