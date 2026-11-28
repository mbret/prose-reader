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
  it("gives the first unit when there is no cfi to start at", () => {
    expect(getIndexOfStartUnit(units, undefined)).toBe(0)
  })

  it("gives no unit for a narration that has none", () => {
    expect(getIndexOfStartUnit([], undefined)).toBeUndefined()
    expect(getIndexOfStartUnit([], `${paragraph(1)}/1:0)`)).toBeUndefined()
  })

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
      title: "the end of a unit, where the next one starts later",
      cfi: `${paragraph(1)}/1:10)`,
      expected: 1,
    },
    {
      title: "the end of a unit, where the next one starts",
      cfi: `${paragraph(1)}/1:20)`,
      expected: 2,
    },
    {
      title: "the second node of a unit that spans two",
      cfi: `${paragraph(1)}/3:2)`,
      expected: 2,
    },
    {
      title: "the space between two paragraphs",
      cfi: `${paragraph(1)}/3:7)`,
      expected: 3,
    },
    {
      title: "the middle of the last unit",
      cfi: `${paragraph(2)}/1:5)`,
      expected: 3,
    },
    {
      title: "a range, by its start",
      cfi: `${paragraph(1)}/1,:12,:40)`,
      expected: 1,
    },
    {
      title: "the cfi of a unit",
      cfi: `${paragraph(1)},/1:21,/3:5)`,
      expected: 2,
    },
  ])("gives unit $expected for $title", ({ cfi, expected }) => {
    expect(getIndexOfStartUnit(units, cfi)).toBe(expected)
  })

  it.each([
    { title: "the end of the last unit", cfi: `${paragraph(2)}/1:30)` },
    { title: "a place after the last unit", cfi: `${paragraph(3)}/1:0)` },
  ])("gives no unit for $title", ({ cfi }) => {
    expect(getIndexOfStartUnit(units, cfi)).toBeUndefined()
  })

  describe("units whose cfi is not a range", () => {
    const pointUnits = [
      { cfi: `${paragraph(1)}/1:0)` },
      { cfi: `${paragraph(1)}/1:11)` },
      { cfi: `${paragraph(2)}/1:0)` },
    ]

    it.each([
      {
        title: "the unit at the cfi",
        cfi: `${paragraph(1)}/1:11)`,
        expected: 1,
      },
      {
        title: "the next unit for a cfi between two",
        cfi: `${paragraph(1)}/1:12)`,
        expected: 2,
      },
    ])("gives $title", ({ cfi, expected }) => {
      expect(getIndexOfStartUnit(pointUnits, cfi)).toBe(expected)
    })
  })

  it("throws for a unit whose cfi cannot be read", () => {
    expect(() =>
      getIndexOfStartUnit([{ cfi: "unit-1" }], `${paragraph(1)}/1:0)`),
    ).toThrow()
  })

  it("reads the cfi of a few units only, of a narration that has many", () => {
    let numberOfCfisRead = 0
    const manyUnits = Array.from({ length: 20000 }, (_, index) => ({
      get cfi() {
        numberOfCfisRead++

        return `${paragraph(1)}/1,:${index * 10},:${index * 10 + 5})`
      },
    }))

    expect(getIndexOfStartUnit(manyUnits, `${paragraph(1)}/1:123456)`)).toBe(
      12346,
    )
    // A search of twenty thousand units takes fifteen steps.
    expect(numberOfCfisRead).toBeLessThanOrEqual(15)
  })
})
