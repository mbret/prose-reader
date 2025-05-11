import { expect, it } from "vitest"
import { parse } from "./parse"

it("should parse a CFI with indirection", () => {
  const cfi = "epubcfi(/6/4[chap01ref]!/4[body01]/10[para05]/2:3)"
  const parsed = parse(cfi)

  expect(parsed).toEqual([
    [{ index: 6 }, { index: 4, id: "chap01ref" }],
    [
      { index: 4, id: "body01" },
      { index: 10, id: "para05" },
      { index: 2, offset: 3 },
    ],
  ])
})

it("should parse a CFI with indirection only", () => {
  const cfi = "epubcfi(/6/4[chap01ref]!)"
  const parsed = parse(cfi)

  expect(parsed).toEqual([[{ index: 6 }, { index: 4, id: "chap01ref" }], []])
})
