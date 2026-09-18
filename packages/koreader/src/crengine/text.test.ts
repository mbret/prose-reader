import { describe, expect, it } from "vitest"
import {
  CRENGINE_TEXT_SPLIT_SIZE,
  getCrengineTextLength,
  isEmptySpace,
  splitTextPieces,
  toCrengineOffset,
  toRawOffset,
} from "./text"

const normal = { pre: false, stripsLeadingNewline: false }
const pre = { pre: true, stripsLeadingNewline: false }
const preFirst = { pre: true, stripsLeadingNewline: true }

/** crengine's text, rebuilt from the mapping, for readable expectations. */
const crengineText = (text: string, mode = normal) => {
  const length = getCrengineTextLength(text, mode)
  let output = ""

  for (let offset = 0; offset < length; offset++) {
    const raw = toRawOffset(text, offset, mode)
    const next = toRawOffset(text, offset + 1, mode)

    if (raw === undefined || next === undefined) throw new Error("unmapped")

    const codePoint = text.codePointAt(raw) ?? 0
    const char = String.fromCodePoint(codePoint)

    // one raw code point may stand for several crengine characters (a tab)
    output +=
      char === "\t"
        ? " "
        : /[\r\n]/.test(char)
          ? "\n"
          : /[\t ]/.test(char)
            ? " "
            : char
    void next
  }

  return output
}

describe("isEmptySpace", () => {
  it("counts only space, tab, CR and LF as space", () => {
    expect(isEmptySpace("")).toBe(true)
    expect(isEmptySpace(" \t\r\n")).toBe(true)
    expect(isEmptySpace(" ")).toBe(false)
    expect(isEmptySpace(" a ")).toBe(false)
    expect(isEmptySpace(" ")).toBe(false)
    expect(isEmptySpace("\f")).toBe(false)
  })
})

describe("normal whitespace mode (PreProcessXmlString, not pre)", () => {
  it.each([
    ["abc", 3],
    ["a b", 3],
    ["a   b", 3],
    [" a", 2],
    ["a ", 2],
    ["  a  ", 3],
    ["a\nb", 3],
    ["a\r\nb", 3],
    ["\n  a\t\tb\n", 5],
    ["a  b", 4],
    ["   ", 1],
    ["", 0],
    ["a😀b", 3],
    ["😀 😀", 3],
  ])("length of %j is %i", (text, length) => {
    expect(getCrengineTextLength(text, normal)).toBe(length)
  })

  it("maps raw offsets to collapsed code point offsets", () => {
    const text = "a   b\r\nc"
    // crengine: "a b c" (each run is one space)
    expect(toCrengineOffset(text, 0, normal)).toBe(0)
    expect(toCrengineOffset(text, 1, normal)).toBe(1)
    expect(toCrengineOffset(text, 2, normal)).toBe(2)
    expect(toCrengineOffset(text, 3, normal)).toBe(2)
    expect(toCrengineOffset(text, 4, normal)).toBe(2)
    expect(toCrengineOffset(text, 5, normal)).toBe(3)
    expect(toCrengineOffset(text, 6, normal)).toBe(4)
    expect(toCrengineOffset(text, 7, normal)).toBe(4)
    expect(toCrengineOffset(text, 8, normal)).toBe(5)
  })

  it("maps collapsed offsets back before the next kept character", () => {
    const text = "a   b\r\nc"
    expect(toRawOffset(text, 0, normal)).toBe(0)
    expect(toRawOffset(text, 1, normal)).toBe(1)
    expect(toRawOffset(text, 2, normal)).toBe(4)
    expect(toRawOffset(text, 3, normal)).toBe(5)
    expect(toRawOffset(text, 4, normal)).toBe(7)
    expect(toRawOffset(text, 5, normal)).toBe(8)
    expect(toRawOffset(text, 6, normal)).toBeUndefined()
    expect(toRawOffset(text, -1, normal)).toBeUndefined()
  })

  it("keeps a leading and a trailing space", () => {
    expect(toRawOffset("  a  ", 0, normal)).toBe(0)
    expect(toRawOffset("  a  ", 1, normal)).toBe(2)
    expect(toRawOffset("  a  ", 2, normal)).toBe(3)
    expect(toRawOffset("  a  ", 3, normal)).toBe(5)
    expect(toCrengineOffset("  a  ", 5, normal)).toBe(3)
  })

  it("does not collapse non-breaking spaces", () => {
    const text = "a    b"
    expect(getCrengineTextLength(text, normal)).toBe(6)
    expect(toRawOffset(text, 5, normal)).toBe(5)
  })

  it("counts code points, not UTF-16 units", () => {
    const text = "😀😀 x"
    expect(getCrengineTextLength(text, normal)).toBe(4)
    expect(toCrengineOffset(text, 2, normal)).toBe(1)
    expect(toCrengineOffset(text, 4, normal)).toBe(2)
    expect(toCrengineOffset(text, 6, normal)).toBe(4)
    expect(toRawOffset(text, 1, normal)).toBe(2)
    expect(toRawOffset(text, 2, normal)).toBe(4)
    expect(toRawOffset(text, 3, normal)).toBe(5)
    expect(toRawOffset(text, 4, normal)).toBe(6)
  })

  it("counts a raw offset inside a surrogate pair as before the pair", () => {
    expect(toCrengineOffset("😀a", 1, normal)).toBe(0)
  })

  it("collapses a run that spans a surrogate pair boundary", () => {
    const text = "😀 \n \t😀"
    expect(crengineText(text)).toBe("😀 😀")
    expect(toRawOffset(text, 2, normal)).toBe(6)
  })
})

describe("pre whitespace mode (PreProcessXmlString with TXTFLG_PRE, ExpandTabs)", () => {
  it("keeps spaces and newlines verbatim", () => {
    const text = "a  b\n\n c"
    expect(getCrengineTextLength(text, pre)).toBe(text.length)
    expect(toRawOffset(text, 5, pre)).toBe(5)
    expect(toCrengineOffset(text, 5, pre)).toBe(5)
  })

  it("turns CRLF into one newline and a lone CR into a newline", () => {
    expect(getCrengineTextLength("a\r\nb", pre)).toBe(3)
    expect(toRawOffset("a\r\nb", 2, pre)).toBe(3)
    // between the dropped \r and the kept \n: before the newline
    expect(toCrengineOffset("a\r\nb", 2, pre)).toBe(1)
    expect(getCrengineTextLength("a\rb", pre)).toBe(3)
    expect(getCrengineTextLength("a\n\rb", pre)).toBe(3)
    expect(getCrengineTextLength("a\r\rb", pre)).toBe(3)
  })

  it("expands tabs to 8-column stops, a newline counting as the first column of its line", () => {
    expect(getCrengineTextLength("\tx", pre)).toBe(9)
    expect(getCrengineTextLength("ab\tx", pre)).toBe(9)
    expect(getCrengineTextLength("abcdefgh\tx", pre)).toBe(17)
    // "a\n" then "b" is column 2, the tab reaches column 8: 6 spaces
    expect(getCrengineTextLength("a\nb\tx", pre)).toBe(10)
    expect(getCrengineTextLength("\n\tx", pre)).toBe(9)
    expect(toCrengineOffset("ab\tx", 3, pre)).toBe(8)
    expect(toRawOffset("ab\tx", 8, pre)).toBe(3)
    expect(toRawOffset("ab\tx", 4, pre)).toBe(2)
  })

  it("drops a newline immediately following the pre start tag", () => {
    expect(getCrengineTextLength("\nabc", preFirst)).toBe(3)
    expect(toRawOffset("\nabc", 0, preFirst)).toBe(1)
    expect(toCrengineOffset("\nabc", 1, preFirst)).toBe(0)
    expect(toCrengineOffset("\nabc", 2, preFirst)).toBe(1)
    expect(getCrengineTextLength("\r\nabc", preFirst)).toBe(3)
    expect(getCrengineTextLength("\n\nabc", preFirst)).toBe(4)
    expect(getCrengineTextLength("\n", preFirst)).toBe(0)
    expect(toRawOffset("\n", 0, preFirst)).toBe(1)
    expect(getCrengineTextLength("abc\n", preFirst)).toBe(4)
  })

  it("does not strip the newline when the text is not the first child", () => {
    expect(getCrengineTextLength("\nabc", pre)).toBe(4)
  })
})

describe("raw <-> crengine offsets, property-style", () => {
  const alphabet = [
    " ",
    " ",
    "\t",
    "\n",
    "\r\n",
    " ",
    "a",
    "b",
    "é",
    "ß",
    "日",
    "😀",
    "🧑‍🚀",
    "​",
  ]

  const random = (seed: number) => {
    let state = seed

    return () => {
      state = (state * 1664525 + 1013904223) % 4294967296

      return state / 4294967296
    }
  }

  const randomText = (next: () => number) => {
    const length = Math.floor(next() * 40)
    let text = ""

    for (let index = 0; index < length; index++) {
      text += alphabet[Math.floor(next() * alphabet.length)]
    }

    return text
  }

  /**
   * Independent model of crengine's text: the number of characters kept for
   * each raw code point (0 = dropped, several = expanded tab).
   */
  const unitsPerCodePoint = (text: string, mode: typeof normal) => {
    const units: { raw: number; units: number }[] = []
    let spaces = 0
    let lastChar = ""
    let column = 0
    let strip = mode.stripsLeadingNewline

    for (let raw = 0; raw < text.length; ) {
      const char = String.fromCodePoint(text.codePointAt(raw) ?? 0)
      let count = 1

      if (!mode.pre) {
        if (/[ \r\n\t]/.test(char)) {
          count = spaces === 0 ? 1 : 0
          spaces++
        } else {
          spaces = 0
        }
      } else {
        let newline = false

        if (char === "\r") {
          const next = text[raw + 1]
          const kept = (raw === 0 || lastChar !== "\n") && next !== "\n"

          if (kept) {
            newline = true
            lastChar = "\n"
          } else {
            count = 0
          }
        } else if (char === "\n") {
          newline = true
          lastChar = "\n"
        } else if (char === "\t") {
          count = 8 - (column % 8)
          column += count
          lastChar = "\t"
        } else {
          column++
          lastChar = char
        }

        if (newline) column = 1

        if (count > 0 && strip) {
          strip = false

          if (newline) count = 0
        }
      }

      units.push({ raw, units: count })
      raw += char.length
    }

    return units
  }

  it.each([normal, pre, preFirst])(
    "maps every position between raw and crengine offsets per the model (%j)",
    (mode) => {
      const next = random(42)

      for (let sample = 0; sample < 400; sample++) {
        const text = randomText(next)
        const units = unitsPerCodePoint(text, mode)
        const length = units.reduce((sum, entry) => sum + entry.units, 0)

        expect(getCrengineTextLength(text, mode)).toBe(length)

        // raw -> crengine: characters of the code points ending before the offset
        for (let raw = 0; raw <= text.length; raw++) {
          const expected = units
            .filter(
              (entry) =>
                entry.raw +
                  String.fromCodePoint(text.codePointAt(entry.raw) ?? 0)
                    .length <=
                raw,
            )
            .reduce((sum, entry) => sum + entry.units, 0)

          expect(toCrengineOffset(text, raw, mode)).toBe(expected)
        }

        // crengine -> raw: a boundary offset lands right before the next kept
        // code point, an offset inside an expanded tab before the tab.
        let offset = 0

        for (const entry of units) {
          if (entry.units === 0) continue

          for (let inside = 0; inside < entry.units; inside++) {
            expect(toRawOffset(text, offset + inside, mode)).toBe(entry.raw)
          }

          offset += entry.units
        }

        expect(toRawOffset(text, length, mode)).toBe(text.length)
        expect(toRawOffset(text, length + 1, mode)).toBeUndefined()
      }
    },
  )
})

describe("splitTextPieces (TEXT_SPLIT_SIZE)", () => {
  it("keeps short text whole", () => {
    expect(splitTextPieces("")).toEqual([{ start: 0, end: 0 }])
    expect(splitTextPieces("a".repeat(CRENGINE_TEXT_SPLIT_SIZE - 1))).toEqual([
      { start: 0, end: CRENGINE_TEXT_SPLIT_SIZE - 1 },
    ])
  })

  it("splits after the last space of the first 8192 code points", () => {
    const word = "abcdefghi " // 10 chars
    const text = word.repeat(1000) // 10000 chars, spaces at 9, 19, ...
    const pieces = splitTextPieces(text)

    expect(pieces).toEqual([
      { start: 0, end: 8190 },
      { start: 8190, end: 10000 },
    ])
  })

  it("splits exactly at 8192 when the window has no space", () => {
    const text = "a".repeat(9000)
    expect(splitTextPieces(text)).toEqual([
      { start: 0, end: 8192 },
      { start: 8192, end: 9000 },
    ])
  })

  it("splits after a newline, right after a CRLF pair", () => {
    const text = `${"a".repeat(8000)}\r\n${"b".repeat(1000)}`
    expect(splitTextPieces(text)).toEqual([
      { start: 0, end: 8002 },
      { start: 8002, end: text.length },
    ])

    const lone = `${"a".repeat(8000)}\n${"b".repeat(1000)}`
    expect(splitTextPieces(lone)).toEqual([
      { start: 0, end: 8001 },
      { start: 8001, end: lone.length },
    ])
  })

  it("splits a text of exactly 8192 code points that contains a space", () => {
    const text = `${"a".repeat(4000)} ${"b".repeat(4191)}`
    expect(text.length).toBe(CRENGINE_TEXT_SPLIT_SIZE)
    expect(splitTextPieces(text)).toEqual([
      { start: 0, end: 4001 },
      { start: 4001, end: 8192 },
    ])
  })

  it("never emits an empty piece", () => {
    const text = `${"a".repeat(8191)} `
    expect(splitTextPieces(text)).toEqual([{ start: 0, end: 8192 }])
  })

  it("counts code points, so emoji make the window shorter in UTF-16 units", () => {
    const text = `${"😀".repeat(8191)} ${"b".repeat(10)}`
    // 8191 emoji + 1 space = 8192 code points, the space is the split
    expect(splitTextPieces(text)).toEqual([
      { start: 0, end: 8191 * 2 + 1 },
      { start: 8191 * 2 + 1, end: text.length },
    ])
  })

  it("keeps splitting a very long text", () => {
    const text = "word ".repeat(5000) // 25000 chars
    const pieces = splitTextPieces(text)

    expect(pieces.length).toBe(4)
    expect(pieces[0]).toEqual({ start: 0, end: 8190 })
    expect(pieces.at(-1)?.end).toBe(text.length)

    for (let index = 1; index < pieces.length; index++) {
      expect(pieces[index]?.start).toBe(pieces[index - 1]?.end)
    }
  })
})
