import { describe, expect, it } from "vitest"
import { parseXPointer } from "./parse"
import { serializeXPointer } from "./serialize"
import type { ParsedXPointer } from "./types"

const element = (name: string, index?: number) => ({
  kind: "element" as const,
  name,
  index,
})
const text = (index?: number) => ({ kind: "text" as const, index })
const nodeIndex = (index: number) => ({ kind: "nodeIndex" as const, index })

const accepted: [string, ParsedXPointer][] = [
  [
    "/body/DocFragment[22]/body/div/div[1]/blockquote[3]/p[1]/span/text().0",
    {
      spineItemIndex: 21,
      steps: [
        element("div"),
        element("div", 1),
        element("blockquote", 3),
        element("p", 1),
        element("span"),
        text(),
      ],
      point: 0,
      containsBoxingElements: false,
    },
  ],
  [
    "/body/DocFragment[3]/body/section/div[5]/div/p/text()[1].0",
    {
      spineItemIndex: 2,
      steps: [
        element("section"),
        element("div", 5),
        element("div"),
        element("p"),
        text(1),
      ],
      point: 0,
      containsBoxingElements: false,
    },
  ],
  [
    "/body/DocFragment[8]/body/div/p[28]/text().264",
    {
      spineItemIndex: 7,
      steps: [element("div"), element("p", 28), text()],
      point: 264,
      containsBoxingElements: false,
    },
  ],
  [
    "/body/DocFragment[3]/body/div/div[3]/text()[3].39",
    {
      spineItemIndex: 2,
      steps: [element("div"), element("div", 3), text(3)],
      point: 39,
      containsBoxingElements: false,
    },
  ],
  // the 5-segment element point Kavita choked on (Kareadita/Kavita#4932)
  [
    "/body/DocFragment[28]/body/p[99].0",
    {
      spineItemIndex: 27,
      steps: [element("p", 99)],
      point: 0,
      containsBoxingElements: false,
    },
  ],
  [
    "/body/DocFragment[3]/body/h1",
    {
      spineItemIndex: 2,
      steps: [element("h1")],
      point: undefined,
      containsBoxingElements: false,
    },
  ],
  [
    "/body/DocFragment[3]/body",
    {
      spineItemIndex: 2,
      steps: [],
      point: undefined,
      containsBoxingElements: false,
    },
  ],
  [
    "/body/DocFragment[3]/body.0",
    {
      spineItemIndex: 2,
      steps: [],
      point: 0,
      containsBoxingElements: false,
    },
  ],
  [
    "/body/DocFragment[2]/body/4/1/text().3",
    {
      spineItemIndex: 1,
      steps: [nodeIndex(4), nodeIndex(1), text()],
      point: 3,
      containsBoxingElements: false,
    },
  ],
  [
    "/body/DocFragment[5]/body/section/p[2]/a/em/sup/text()[2].1",
    {
      spineItemIndex: 4,
      steps: [
        element("section"),
        element("p", 2),
        element("a"),
        element("em"),
        element("sup"),
        text(2),
      ],
      point: 1,
      containsBoxingElements: false,
    },
  ],
  [
    "/body/DocFragment[1]/body/svg/text/tspan/text().4",
    {
      spineItemIndex: 0,
      steps: [element("svg"), element("text"), element("tspan"), text()],
      point: 4,
      containsBoxingElements: false,
    },
  ],
  [
    "/body/DocFragment[4]/body/div/img.0",
    {
      spineItemIndex: 3,
      steps: [element("div"), element("img")],
      point: 0,
      containsBoxingElements: false,
    },
  ],
]

describe("parseXPointer", () => {
  it.each(accepted)("parses %s", (input, expected) => {
    expect(parseXPointer(input)).toEqual(expected)
  })

  it("parses the explicit-index shape of DOM versions >= 20260812 like the classic one", () => {
    const explicit = parseXPointer(
      "/body[1]/DocFragment[22]/body[1]/div[1]/p[3]/text()[1].42",
    )

    expect(explicit).toEqual({
      spineItemIndex: 21,
      steps: [element("div", 1), element("p", 3), text(1)],
      point: 42,
      containsBoxingElements: false,
    })
  })

  it("takes an unindexed DocFragment as the first spine item, as crengine writes it for single-item books", () => {
    expect(parseXPointer("/body/DocFragment/body/p/text().2")).toEqual({
      spineItemIndex: 0,
      steps: [element("p"), text()],
      point: 2,
      containsBoxingElements: false,
    })
  })

  it("takes a bare DocFragment step, with or without a point, as the start of the spine item", () => {
    const expected = {
      spineItemIndex: 9,
      steps: [],
      point: undefined,
      containsBoxingElements: false,
    }

    expect(parseXPointer("/body/DocFragment[10]")).toEqual(expected)
    expect(parseXPointer("/body/DocFragment[10].0")).toEqual(expected)
  })

  it("flags V1 pointers that go through crengine boxing elements", () => {
    const parsed = parseXPointer(
      "/body/DocFragment[12]/body/div/autoBoxing[1]/p[3]/text().42",
    )

    expect(parsed).toEqual({
      spineItemIndex: 11,
      steps: [
        element("div"),
        element("autoBoxing", 1),
        element("p", 3),
        text(),
      ],
      point: 42,
      containsBoxingElements: true,
    })

    for (const name of [
      "floatBox",
      "inlineBox",
      "tabularBox",
      "rubyBox",
      "mathBox",
      "pseudoElem",
    ]) {
      expect(
        parseXPointer(`/body/DocFragment[1]/body/div/${name}/text().0`)
          ?.containsBoxingElements,
      ).toBe(true)
    }
  })

  it("compares element names of the prefix case-insensitively", () => {
    expect(parseXPointer("/BODY/docfragment[2]/Body/P/text().1")).toEqual({
      spineItemIndex: 1,
      steps: [element("P"), text()],
      point: 1,
      containsBoxingElements: false,
    })
  })

  it.each([
    ["", "empty"],
    ["   ", "blank"],
    ["/body/p/text().3", "missing DocFragment"],
    ["/body/DocFragment[0]/body/p", "DocFragment[0]"],
    ["/body/DocFragment[2]/body/p[0]", "[0] index"],
    ["/body/DocFragment[2]/body/p[-1]", "negative index"],
    ["/body/DocFragment[2]/body/p/text().-1", "negative point"],
    ["/body/DocFragment[2]/body/p/text().3/span", ".N not at the end"],
    ["/body/DocFragment[2]/body/p/text().3.4", "two points"],
    ["/body/DocFragment[2]/body/p/text().", "point without digits"],
    [
      "/body/DocFragment[2]/body/p/text().3x",
      "trailing garbage after the point",
    ],
    ["/body/DocFragment[2]/body/p[2]x", "trailing garbage after an index"],
    ["/body/DocFragment[2]/body/p[2", "unclosed index"],
    ["/body/DocFragment[2]/body/p[]", "empty index"],
    ["/body/DocFragment[2]/body/p[two]", "non-numeric index"],
    ["/body/DocFragment[2]/body/p[2a]", "partly numeric index"],
    ["/body/DocFragment[2]/body/p[ 2]", "blank in an index"],
    ["/body/DocFragment[2]/body/text()x", "text() with a name suffix"],
    ["/body/DocFragment[2]/body//p", "empty step"],
    ["/body/DocFragment[2]/body/", "trailing slash"],
    ["body/DocFragment[2]/body/p", "missing leading slash"],
    ["/body[2]/DocFragment[2]/body/p", "second root body"],
    ["/body/DocFragment[2]/body[2]/p", "second fragment body"],
    ["/body/DocFragment[2]/div/p", "fragment child that is not the body"],
    ["/body/DocFragment[2]/4/p", "node index in place of the fragment body"],
    ["/html/body/DocFragment[2]/body/p", "extra root step"],
    ["/DocFragment[2]/body/p", "missing root body"],
    ["#_doc_fragment_2_ chapter1", "#id form"],
    ["#chapter1", "#id form"],
    ["/body/DocFragment[2]/body/0", "node index 0"],
    ["/body/DocFragment[2]/body/p/text().3 ", "trailing blank"],
    [" /body/DocFragment[2]/body/p", "leading blank"],
    ["epubcfi(/6/4!/4/2/1:3)", "a CFI"],
  ])("rejects %j (%s)", (input) => {
    expect(parseXPointer(input)).toBeUndefined()
  })

  it("keeps steps below a text node for the resolver to reject", () => {
    expect(parseXPointer("/body/DocFragment[2]/body/p/text()/span")).toEqual({
      spineItemIndex: 1,
      steps: [element("p"), text(), element("span")],
      point: undefined,
      containsBoxingElements: false,
    })
  })
})

describe("serializeXPointer", () => {
  it.each(accepted.filter(([input]) => input.includes("]/body")))(
    "round-trips %s",
    (input, parsed) => {
      expect(serializeXPointer(parsed)).toBe(input)
      expect(parseXPointer(serializeXPointer(parsed))).toEqual(parsed)
    },
  )

  it("writes the classic prefix for the bare and unindexed fragment forms", () => {
    for (const input of [
      "/body/DocFragment[10]",
      "/body/DocFragment[10].0",
      "/body/DocFragment[10]/body",
    ]) {
      const parsed = parseXPointer(input)

      expect(parsed).toBeDefined()
      expect(parsed && serializeXPointer(parsed)).toBe(
        "/body/DocFragment[10]/body",
      )
    }

    const single = parseXPointer("/body/DocFragment/body/p/text().2")

    expect(single && serializeXPointer(single)).toBe(
      "/body/DocFragment[1]/body/p/text().2",
    )
  })

  it("keeps every index it was given, including explicit [1]", () => {
    const explicit = "/body[1]/DocFragment[22]/body[1]/div[1]/p[3]/text()[1].42"
    const parsed = parseXPointer(explicit)

    expect(parsed && serializeXPointer(parsed)).toBe(
      "/body/DocFragment[22]/body/div[1]/p[3]/text()[1].42",
    )
  })

  it("writes node index steps and boxing steps back as they were", () => {
    for (const input of [
      "/body/DocFragment[2]/body/4/1/text().3",
      "/body/DocFragment[12]/body/div/autoBoxing[1]/p[3]/text().42",
    ]) {
      const parsed = parseXPointer(input)

      expect(parsed && serializeXPointer(parsed)).toBe(input)
    }
  })
})
