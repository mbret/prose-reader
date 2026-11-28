import { describe, expect, it } from "vitest"
import { collapse } from "./collapse.ts"
import { compare } from "./compare.ts"

describe("collapse", () => {
  it.each([
    {
      title: "offsets of its parent path",
      range: "epubcfi(/6/4[chap01ref]!/4/2/1,:100,:150)",
      start: "epubcfi(/6/4[chap01ref]!/4/2/1:100)",
      end: "epubcfi(/6/4[chap01ref]!/4/2/1:150)",
    },
    {
      title: "paths under its parent path",
      range: "epubcfi(/6/4[chap01ref]!/4/2,/1:3,/3:5)",
      start: "epubcfi(/6/4[chap01ref]!/4/2/1:3)",
      end: "epubcfi(/6/4[chap01ref]!/4/2/3:5)",
    },
    {
      title: "a path that repeats the last step of its parent path",
      range: "epubcfi(/6/4!/4,/2[p1]/1:0,/4[p2]:0)",
      start: "epubcfi(/6/4!/4/2[p1]/1:0)",
      end: "epubcfi(/6/4!/4/4[p2]:0)",
    },
    {
      title: "a step into another document",
      range: "epubcfi(/6/4,!/4/4/1:0,!/4/4/1:5)",
      start: "epubcfi(/6/4!/4/4/1:0)",
      end: "epubcfi(/6/4!/4/4/1:5)",
    },
    {
      title: "extensions",
      range: "epubcfi(/6/4!/4/2[p1]/1[;vnd.x=y],:3[;vnd.x=y],:9[;vnd.x=y])",
      start: "epubcfi(/6/4!/4/2[p1]/1[;vnd.x=y]:3[;vnd.x=y])",
      end: "epubcfi(/6/4!/4/2[p1]/1[;vnd.x=y]:9[;vnd.x=y])",
    },
    {
      title: "no step into another document",
      range: "epubcfi(/4[body01]/10[para05],/2/1:1,/3:4)",
      start: "epubcfi(/4[body01]/10[para05]/2/1:1)",
      end: "epubcfi(/4[body01]/10[para05]/3:4)",
    },
    {
      title: "no epubcfi() around it",
      range: "/6/4!/4/2/1,:100,:150",
      start: "/6/4!/4/2/1:100",
      end: "/6/4!/4/2/1:150",
    },
  ])(
    "gives the point a range starts at, and the point it ends at, with $title",
    ({ range, start, end }) => {
      expect(collapse(range)).toBe(start)
      expect(collapse(range, { to: "start" })).toBe(start)
      expect(collapse(range, { to: "end" })).toBe(end)
    },
  )

  it.each([
    {
      title: "the text before and after a place",
      range: "epubcfi(/6/4!/4/2/1,:3[one,two],:9[three,four])",
      start: "epubcfi(/6/4!/4/2/1:3[one,two])",
    },
    {
      title: "an id that holds an escaped comma",
      range: "epubcfi(/6/4[a^,b]!/4/2/1,:3,:9)",
      start: "epubcfi(/6/4[a^,b]!/4/2/1:3)",
    },
    {
      title: "an id that holds an escaped bracket before a comma",
      range: "epubcfi(/6/4[a^]b,c]!/4/2/1,:3,:9)",
      start: "epubcfi(/6/4[a^]b,c]!/4/2/1:3)",
    },
  ])(
    "does not read as a boundary a comma in an assertion: $title",
    ({ range, start }) => {
      expect(collapse(range)).toBe(start)
    },
  )

  it("gives a point as it is", () => {
    const point = "epubcfi(/6/4[chap01ref]!/4/2/1:100[one,two])"

    expect(collapse(point)).toBe(point)
    expect(collapse(point, { to: "end" })).toBe(point)
  })

  it.each(["epubcfi(/6/4!/4/2/1,:100)", "epubcfi(/6/4!/4/2/1,:100,:150,:200)"])(
    "refuses %s, which is not a point and has no start and end",
    (cfi) => {
      expect(() => collapse(cfi)).toThrow(/one start and one end/)
    },
  )

  describe("to order CFIs by where they start", () => {
    const orderOfStarts = (a: string, b: string) =>
      compare(collapse(a), collapse(b))

    it.each([
      {
        point: "epubcfi(/6/4!/4/2/1:99)",
        expected: 1,
        title: "before its start",
      },
      { point: "epubcfi(/6/4!/4/2/1:100)", expected: 0, title: "at its start" },
      { point: "epubcfi(/6/4!/4/2/1:120)", expected: -1, title: "inside it" },
      {
        point: "epubcfi(/6/4!/4/4/1:0)",
        expected: -1,
        title: "in a later element",
      },
    ])(
      "orders a range of a text node against a point $title",
      ({ point, expected }) => {
        const range = "epubcfi(/6/4!/4/2/1,:100,:150)"

        expect(orderOfStarts(range, point)).toBe(expected)
        // The `|| 0` makes a negative zero the zero it means.
        expect(orderOfStarts(point, range)).toBe(-expected || 0)
      },
    )

    it("orders two ranges of one text node, whichever way each is written", () => {
      const offsetsOfParent = "epubcfi(/6/4!/4/2/1,:100,:150)"
      const pathsUnderParent = "epubcfi(/6/4!/4/2,/1:120,/1:130)"

      expect(orderOfStarts(offsetsOfParent, pathsUnderParent)).toBe(-1)
      expect(orderOfStarts(pathsUnderParent, offsetsOfParent)).toBe(1)
    })

    it("puts the end of a range after its start", () => {
      const range = "epubcfi(/6/4!/4,/2[p1]/1:0,/4[p2]:0)"

      expect(
        compare(
          collapse(range, { to: "start" }),
          collapse(range, { to: "end" }),
        ),
      ).toBe(-1)
    })
  })
})
