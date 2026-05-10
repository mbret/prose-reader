import { describe, expect, it } from "vitest"
import { detectPageSpreadFromBasename } from "./detectPageSpreadFromBasename"

describe("detectPageSpreadFromBasename", () => {
  it("should detect consecutive pages with an explicit p prefix", () => {
    expect(
      detectPageSpreadFromBasename(
        "p006-007 [dig] [Seven Seas] [danke-Empire] {HQ}.jpg",
      ),
    ).toEqual({
      firstPageLabel: "006",
      secondPageLabel: "007",
    })
  })

  it("should ignore page word prefixes", () => {
    expect(detectPageSpreadFromBasename("page 12_page 13.png")).toBeUndefined()
  })

  it("should detect consecutive pages with repeated p prefixes", () => {
    expect(detectPageSpreadFromBasename("p002-p003.jpg")).toEqual({
      firstPageLabel: "002",
      secondPageLabel: "003",
    })
  })

  it("should detect consecutive pages with leading zeroes and no prefix", () => {
    expect(detectPageSpreadFromBasename("006-007.webp")).toEqual({
      firstPageLabel: "006",
      secondPageLabel: "007",
    })
  })

  it("should not detect bare-bone numbers that could be many other things", () => {
    expect(detectPageSpreadFromBasename("1-2.webp")).toBeUndefined()
  })

  it("should not detect anything that is not just number or the common `p` prefix", () => {
    expect(detectPageSpreadFromBasename("g006-g007.webp")).toBeUndefined()
  })

  it("should ignore unprefixed ranges without leading zeroes", () => {
    expect(detectPageSpreadFromBasename("chapter-6-7.jpg")).toBeUndefined()
  })

  it("should ignore unprefixed ranges embedded in a word", () => {
    expect(detectPageSpreadFromBasename("v01-02.jpg")).toBeUndefined()
  })

  it("should ignore page prefixes embedded in a word", () => {
    expect(detectPageSpreadFromBasename("ap002-003.jpg")).toBeUndefined()
  })

  it("should ignore non-consecutive page ranges", () => {
    expect(detectPageSpreadFromBasename("p006-008.jpg")).toBeUndefined()
  })

  it("should ignore pages above the detection limit", () => {
    expect(detectPageSpreadFromBasename("p2000-2001.jpg")).toBeUndefined()
  })
})
