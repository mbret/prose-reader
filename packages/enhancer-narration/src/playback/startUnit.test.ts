import { describe, expect, it } from "vitest"
import { getIndexOfStartUnit } from "./startUnit.ts"

const paragraph = (index: number) => `epubcfi(/6/4[chapter]!/4/${index * 2}`

/** Three sentences of a first paragraph, then one that spans a second. */
const units = [
  { cfi: `${paragraph(1)}/1,:0,:10)` },
  { cfi: `${paragraph(1)}/1,:11,:20)` },
  // From the text of the paragraph into the text after an inline element.
  { cfi: `${paragraph(1)},/1:21,/3:5)` },
  { cfi: `${paragraph(2)}/1,:0,:30)` },
]

describe("getIndexOfStartUnit", () => {
  it("gives the first unit when no cfi is asked for", () => {
    expect(getIndexOfStartUnit(units, { type: "first" })).toBe(0)
  })

  it("gives no unit for a narration that has none", () => {
    expect(getIndexOfStartUnit([], { type: "first" })).toBeUndefined()
    expect(
      getIndexOfStartUnit([], {
        type: "holdingCfi",
        cfi: `${paragraph(1)}/1:0)`,
      }),
    ).toBeUndefined()
  })

  describe("the first unit that starts at the cfi or after it", () => {
    it.each([
      {
        title: "the start of the spine item",
        cfi: "epubcfi(/6/4[chapter]!)",
        expected: 0,
      },
      {
        title: "the start of a unit",
        cfi: `${paragraph(1)}/1:11)`,
        expected: 1,
      },
      {
        title: "the middle of a unit",
        cfi: `${paragraph(1)}/1:12)`,
        expected: 2,
      },
      {
        title: "the space between two units",
        cfi: `${paragraph(1)}/1:10)`,
        expected: 1,
      },
      {
        title: "the middle of a unit that spans two nodes",
        cfi: `${paragraph(1)}/3:2)`,
        expected: 3,
      },
      {
        title: "a range, by its start",
        cfi: `${paragraph(1)}/1,:12,:40)`,
        expected: 2,
      },
    ])("is unit $expected for $title", ({ cfi, expected }) => {
      expect(
        getIndexOfStartUnit(units, { type: "firstStartingAtOrAfterCfi", cfi }),
      ).toBe(expected)
    })

    it("is no unit when every unit starts before the cfi", () => {
      expect(
        getIndexOfStartUnit(units, {
          type: "firstStartingAtOrAfterCfi",
          cfi: `${paragraph(2)}/1:5)`,
        }),
      ).toBeUndefined()
    })
  })

  describe("the unit that holds the cfi", () => {
    it.each([
      {
        title: "the start of the spine item",
        cfi: "epubcfi(/6/4[chapter]!)",
        expected: 0,
      },
      {
        title: "the start of a unit",
        cfi: `${paragraph(1)}/1:11)`,
        expected: 1,
      },
      {
        title: "the middle of a unit",
        cfi: `${paragraph(1)}/1:12)`,
        expected: 1,
      },
      {
        title: "the space between two units",
        cfi: `${paragraph(1)}/1:10)`,
        expected: 0,
      },
      {
        title: "the second node of a unit that spans two",
        cfi: `${paragraph(1)}/3:2)`,
        expected: 2,
      },
      {
        title: "a place after the last unit",
        cfi: `${paragraph(3)}/1:0)`,
        expected: 3,
      },
      {
        title: "a range, by its start",
        cfi: `${paragraph(1)}/1,:12,:40)`,
        expected: 1,
      },
    ])("is unit $expected for $title", ({ cfi, expected }) => {
      expect(getIndexOfStartUnit(units, { type: "holdingCfi", cfi })).toBe(
        expected,
      )
    })
  })

  it("reads the units in the order of the narration, sorted by cfi or not", () => {
    const [first, second, third, fourth] = units

    if (!first || !second || !third || !fourth) throw new Error("four units")

    // The narration reads the second paragraph first.
    const unitsOutOfDocumentOrder = [fourth, first, second, third]

    expect(
      getIndexOfStartUnit(unitsOutOfDocumentOrder, {
        type: "firstStartingAtOrAfterCfi",
        cfi: `${paragraph(1)}/1:11)`,
      }),
    ).toBe(0)
  })
})
