import {
  generate as generateCfi,
  resolve as resolveCfi,
} from "@prose-reader/cfi"
import { beforeAll, describe, expect, it } from "vitest"
import { cfiToXPointer, xPointerToCfi } from "./cfi"
import { getCrengineChildren, isTextNode } from "./crengine/children"
import { hasImproperTableChildren, isElement } from "./crengine/elements"
import { generateXPointer } from "./generate"
import { parseXPointer } from "./parse"
import { resolveXPointer } from "./resolve"
import { rangeText } from "./tests/dom"
import {
  type FixtureBook,
  isKnownDeviation,
  normalizeText,
  type Oracle,
  openFixtureBook,
  readOracle,
  WHOLE_BOOK_TIMEOUT,
} from "./tests/epub"
import type { DomPosition } from "./types"

/**
 * Every fixture EPUB and the pointers KOReader's crengine produced for it,
 * captured with tools/xpointer-oracle.lua from a KOReader v2026.07 Linux
 * build (crengine DOM 20240114, data/epub.css, "web" block rendering).
 */
const FIXTURES = [
  "synthetic",
  "accessible-epub-3",
  "alice-pg11",
  "frankenstein-pg84",
  "cc-shared-culture",
  "haruko",
  "mathematics",
]

const books = new Map<string, FixtureBook>()
const oracles = new Map<string, Oracle>()

beforeAll(async () => {
  for (const name of FIXTURES) {
    books.set(name, await openFixtureBook(name))
    oracles.set(name, await readOracle(name))
  }
})

const bookOf = (name: string) => {
  const book = books.get(name)

  if (!book) throw new Error(`fixture ${name} not loaded`)

  return book
}

const oracleOf = (name: string) => {
  const oracle = oracles.get(name)

  if (!oracle) throw new Error(`oracle ${name} not loaded`)

  return oracle
}

const comparable = normalizeText

describe.each(FIXTURES)("crengine ground truth: %s", (name) => {
  it("has a fragment per spine item, DocFragment[N] being spine item N-1", () => {
    const book = bookOf(name)
    const oracle = oracleOf(name)

    expect(oracle.fragments.length).toBe(book.spineItems.length)
    oracle.fragments.forEach((fragment, index) => {
      expect(fragment.index).toBe(index)

      for (const [xp] of fragment.words) {
        expect(parseXPointer(xp)?.spineItemIndex).toBe(index)
      }
    })
  })

  it("resolves every sampled word to the text crengine reads there, and writes crengine's own pointers back", {
    timeout: WHOLE_BOOK_TIMEOUT,
  }, () => {
    const book = bookOf(name)
    const oracle = oracleOf(name)
    const pull: string[] = []
    const push: string[] = []
    let words = 0
    let skipped = 0

    for (const fragment of oracle.fragments) {
      const spineItem = book.spineItems[fragment.index]

      if (!spineItem) throw new Error(`no spine item ${fragment.index}`)

      for (const [xp, xpEnd, text] of fragment.words) {
        if (isKnownDeviation(name, xp)) {
          skipped++
          continue
        }

        words++

        // KOReader -> prose: the two pointers must enclose exactly that word
        const start = resolveXPointer(xp, spineItem.document)
        const end = resolveXPointer(xpEnd, spineItem.document)

        if (!start || !end) {
          pull.push(`${xp} .. ${xpEnd}: unresolved`)
          continue
        }

        let got: string

        try {
          got = comparable(rangeText(start, end))
        } catch (error) {
          pull.push(
            `${xp} .. ${xpEnd}: ${String(error)} (${start.node.nodeName}@${start.offset} .. ${end.node.nodeName}@${end.offset})`,
          )
          continue
        }

        if (got !== comparable(text)) {
          pull.push(
            `${xp}: expected ${JSON.stringify(text)}, got ${JSON.stringify(got)}`,
          )
          continue
        }

        // prose -> KOReader: the same positions must come back as crengine's strings
        const back = generateXPointer(start, fragment.index)
        const backEnd = generateXPointer(end, fragment.index)

        if (back !== xp || backEnd !== xpEnd) {
          push.push(
            `${JSON.stringify(text)}: expected ${xp} .. ${xpEnd}, got ${back} .. ${backEnd}`,
          )
        }
      }
    }

    console.info(
      `${name}: ${words} sampled words checked both ways (${skipped} known deviations skipped)`,
    )
    expect(pull, `KOReader -> prose\n${pull.slice(0, 20).join("\n")}`).toEqual(
      [],
    )
    expect(push, `prose -> KOReader\n${push.slice(0, 20).join("\n")}`).toEqual(
      [],
    )
  })
})

/** Every text node under the fragment body, in document order. */
const textNodesOf = (document: Document): Text[] => {
  const nodes: Text[] = []
  const walk = (node: Node) => {
    for (let child = node.firstChild; child; child = child.nextSibling) {
      if (isTextNode(child)) nodes.push(child)
      else walk(child)
    }
  }

  walk(document.body ?? document)

  return nodes
}

const elementsOf = (document: Document): Element[] =>
  Array.from((document.body ?? document.documentElement).querySelectorAll("*"))

/** Whether crengine keeps `text` at all (it is enumerated among its parent's children). */
const isKeptText = (text: Text) => {
  const parent = text.parentNode

  // raw text for crengine's parser, nothing modelled inside
  if (!parent || !isElement(parent) || parent.closest("style, script"))
    return false

  return getCrengineChildren(parent).some(
    (child) => child.kind === "text" && child.node === text,
  )
}

const positionsOf = (text: Text): number[] => {
  const length = text.data.length

  return Array.from(
    new Set([0, 1, Math.floor(length / 2), Math.max(0, length - 1), length]),
  ).filter((offset) => offset <= length)
}

describe.each(FIXTURES)("whole-book round trips: %s", (name) => {
  it("takes every text position to a pointer and back to the same node", {
    timeout: WHOLE_BOOK_TIMEOUT,
  }, () => {
    const book = bookOf(name)
    let positions = 0
    let dropped = 0
    const failures: string[] = []

    for (const spineItem of book.spineItems) {
      // an SVG spine item is addressed as a whole
      if (!spineItem.document.body) continue

      for (const text of textNodesOf(spineItem.document)) {
        for (const offset of positionsOf(text)) {
          const pointer = generateXPointer(
            { node: text, offset },
            spineItem.index,
          )

          if (pointer === undefined) {
            if (isKeptText(text))
              failures.push(
                `${spineItem.href}: no pointer for kept text ${JSON.stringify(text.data.slice(0, 20))} @${offset}`,
              )
            else dropped++
            continue
          }

          positions++

          const resolved = resolveXPointer(pointer, spineItem.document)

          if (!resolved || resolved.node !== text) {
            failures.push(
              `${pointer}: resolved to ${resolved?.node.nodeName ?? "nothing"}`,
            )
            continue
          }

          // The raw offset may move over whitespace crengine dropped or
          // collapsed, or out of the middle of a surrogate pair.
          const resolvedOffset = resolved.offset ?? 0
          const between = text.data.slice(
            Math.min(offset, resolvedOffset),
            Math.max(offset, resolvedOffset),
          )

          if (!/^(?:[ \t\r\n]*|[\ud800-\udfff])$/.test(between)) {
            failures.push(
              `${pointer}: offset ${offset} came back as ${resolvedOffset} over ${JSON.stringify(between)}`,
            )
            continue
          }

          if (generateXPointer(resolved, spineItem.index) !== pointer) {
            failures.push(`${pointer}: not idempotent`)
          }
        }
      }
    }

    console.info(
      `${name}: ${positions} text positions round-tripped, ${dropped} dropped by crengine`,
    )
    expect(failures.slice(0, 20)).toEqual([])
    expect(positions).toBeGreaterThan(0)
  })

  it("takes every element to a pointer and back", {
    timeout: WHOLE_BOOK_TIMEOUT,
  }, () => {
    const book = bookOf(name)
    let elements = 0
    let unpointed = 0
    const failures: string[] = []

    for (const spineItem of book.spineItems) {
      if (!spineItem.document.body) {
        expect(
          generateXPointer(
            { node: spineItem.document.documentElement },
            spineItem.index,
          ),
        ).toBe(`/body/DocFragment[${spineItem.index + 1}]/body`)
        continue
      }

      for (const element of elementsOf(spineItem.document)) {
        const pointer = generateXPointer({ node: element }, spineItem.index)

        if (pointer === undefined) {
          // inside <style> / <script>: raw text for crengine, no elements
          if (!element.parentElement?.closest("style, script")) unpointed++
          continue
        }

        elements++

        const resolved = resolveXPointer(pointer, spineItem.document)

        if (resolved?.node !== element || resolved.offset !== undefined) {
          failures.push(
            `${pointer}: resolved to ${resolved?.node.nodeName ?? "nothing"}`,
          )
        }

        // child boundaries, the way a range CFI can start; unknowable where
        // crengine rebuilds the children (ruby, MathML)
        const boundary = generateXPointer(
          { node: element, offset: element.childNodes.length },
          spineItem.index,
        )

        if (
          boundary === undefined &&
          !element.closest("math, ruby") &&
          !hasImproperTableChildren(element)
        )
          failures.push(`${pointer}: no end boundary`)
      }
    }

    console.info(
      `${name}: ${elements} elements round-tripped (${unpointed} outside crengine's DOM)`,
    )
    expect(failures.slice(0, 20)).toEqual([])
    expect(unpointed).toBe(0)
  })
})

describe.each(FIXTURES)("CFI bridge: %s", (name) => {
  const lookupOf = (book: FixtureBook) => (index: number) => {
    const spineItem = book.spineItems[index]

    return spineItem
      ? { document: spineItem.document, id: spineItem.id }
      : undefined
  }

  it("gives crengine's word pointers the CFI prose generates for that position, and reads it back", () => {
    const book = bookOf(name)
    const oracle = oracleOf(name)
    const getSpineItem = lookupOf(book)
    const failures: string[] = []
    let checked = 0

    for (const fragment of oracle.fragments) {
      const spineItem = book.spineItems[fragment.index]

      if (!spineItem) throw new Error(`no spine item ${fragment.index}`)

      for (const [xp] of fragment.words.filter((_, index) => index % 5 === 0)) {
        if (isKnownDeviation(name, xp)) continue

        const position = resolveXPointer(xp, spineItem.document)

        if (!position) {
          failures.push(`${xp}: unresolved`)
          continue
        }

        checked++

        const expectedCfi = generateCfi({
          node: position.node,
          offset: position.offset,
          spineIndex: fragment.index,
          spineId: spineItem.id,
        })
        const cfi = xPointerToCfi(xp, getSpineItem)

        if (cfi !== expectedCfi) {
          failures.push(`${xp}: expected ${expectedCfi}, got ${cfi}`)
          continue
        }

        const theirs = resolveCfi(cfi, spineItem.document)

        if (
          theirs.isRange ||
          theirs.node !== position.node ||
          (theirs.offset ?? 0) !== (position.offset ?? 0)
        ) {
          failures.push(`${xp}: ${cfi} resolves elsewhere in @prose-reader/cfi`)
          continue
        }

        const back = cfiToXPointer(cfi, getSpineItem)

        if (back !== xp)
          failures.push(`${xp}: came back as ${back} from ${cfi}`)
      }
    }

    console.info(`${name}: ${checked} pointers through the CFI bridge`)
    expect(failures.slice(0, 20)).toEqual([])
  })

  it("maps a root CFI to the start of the spine item and a range CFI to its start", () => {
    const book = bookOf(name)
    const getSpineItem = lookupOf(book)
    let found:
      | { spineItem: FixtureBook["spineItems"][number]; text: Text }
      | undefined

    for (const spineItem of book.spineItems) {
      const text = textNodesOf(spineItem.document).find(
        (node) =>
          node.data.trim().length > 2 &&
          node.nodeType === 3 &&
          isKeptText(node),
      )

      if (text) {
        found = { spineItem, text }
        break
      }
    }

    if (!found) throw new Error("no kept text in the book")

    const { spineItem, text } = found
    const rootCfi = generateCfi({
      spineIndex: spineItem.index,
      spineId: spineItem.id,
    })

    expect(cfiToXPointer(rootCfi, getSpineItem)).toBe(
      `/body/DocFragment[${spineItem.index + 1}]/body`,
    )

    const rangeCfi = generateCfi({
      start: {
        node: text,
        offset: 1,
        spineIndex: spineItem.index,
        spineId: spineItem.id,
      },
      end: {
        node: text,
        offset: 2,
        spineIndex: spineItem.index,
        spineId: spineItem.id,
      },
    })
    const position: DomPosition = { node: text, offset: 1 }

    expect(cfiToXPointer(rangeCfi, getSpineItem)).toBe(
      generateXPointer(position, spineItem.index),
    )
    expect(
      cfiToXPointer("epubcfi(/6/2!/4/2/1:0)", () => undefined),
    ).toBeUndefined()
    expect(
      xPointerToCfi("/body/DocFragment[1]/body/p/text().0", () => undefined),
    ).toBeUndefined()
  })
})

/**
 * Third-party servers and readers parse KOReader pointers with regexes and
 * `split('/')`. These are the shapes their code relies on, so a change in
 * what this package emits fails here before it fails on their side.
 */
const NAIVE_CONSUMERS = {
  /** Kareadita/Kavita KoreaderHelper.UpdateProgressDto: `split('/')`, 6+ parts, DocFragment regex on part 2. */
  kavita: (pointer: string) => {
    const path = pointer.split("/")
    const match = path[2]?.match(/DocFragment\[(\d+)\]/)

    if (!match) return undefined
    if (path.length < 6)
      return { page: Number(match[1]) - 1, scrollId: undefined }

    const lastPart = pointer.split("/body/").at(-1)?.split("/text()")[0]

    return {
      page: Number(match[1]) - 1,
      scrollId: lastPart && `//body/${lastPart.replace(/\.\d+$/, "")}`,
    }
  },
  /** readest/readest xcfi.ts: a `/body` prefix and `DocFragment(?:\[N\])?` regex. */
  readest: (pointer: string) => {
    if (!pointer.startsWith("/body")) return undefined

    const match = pointer.match(/^\/body\/DocFragment(?:\[(\d+)\])?\//)

    return match ? (match[1] ? Number(match[1]) - 1 : 0) : undefined
  },
  /** crosspoint-reader ProgressMapper.parseXPathSteps: digit-only indexes, tags under 12 characters, depth 16. */
  crosspoint: (pointer: string) => {
    const match = pointer.match(/^\/body\/DocFragment\[(\d+)\]\/body(\/.*)?$/)

    if (!match) return undefined

    const rest = (match[2] ?? "")
      .replace(/\/text\(\)(\[\d+\])?(\.\d+)?$/, "")
      .replace(/\.\d+$/, "")
    const steps = rest.split("/").filter(Boolean)

    if (steps.length > 16) return undefined

    for (const step of steps) {
      const parts = step.match(/^([^[]+)(?:\[(\d+)\])?$/)

      if (!parts || (parts[1] ?? "").length >= 12) return undefined
    }

    return { spineIndex: Number(match[1]) - 1, steps }
  },
}

describe("interop with naive consumers", () => {
  it("emits the classic shape every third party parses", {
    timeout: WHOLE_BOOK_TIMEOUT,
  }, () => {
    let pointers = 0

    for (const name of FIXTURES) {
      const book = bookOf(name)

      for (const spineItem of book.spineItems) {
        const emitted = [
          ...textNodesOf(spineItem.document).map((text) =>
            generateXPointer({ node: text, offset: 0 }, spineItem.index),
          ),
          ...elementsOf(spineItem.document).map((element) =>
            generateXPointer({ node: element }, spineItem.index),
          ),
        ].filter((pointer): pointer is string => pointer !== undefined)

        for (const pointer of emitted) {
          pointers++
          expect(pointer).toMatch(
            /^\/body\/DocFragment\[\d+\]\/body(\/[^/]+)*(\.\d+)?$/,
          )
          expect(pointer).not.toContain("body[1]")
          expect(NAIVE_CONSUMERS.kavita(pointer)?.page).toBe(spineItem.index)
          expect(NAIVE_CONSUMERS.readest(pointer)).toBe(spineItem.index)

          const crosspoint = NAIVE_CONSUMERS.crosspoint(pointer)

          // crosspoint gives up on deep or long-named paths; it must at least find the spine item
          expect(
            crosspoint === undefined ||
              crosspoint.spineIndex === spineItem.index,
          ).toBe(true)
        }
      }
    }

    expect(pointers).toBeGreaterThan(1000)
  })
})

describe("performance sanity", () => {
  it("generates and resolves pointers for the largest chapter in a few milliseconds each", () => {
    let largest: { document: Document; index: number; size: number } | undefined

    for (const name of FIXTURES) {
      for (const spineItem of bookOf(name).spineItems) {
        const size = textNodesOf(spineItem.document).length

        if (!largest || size > largest.size)
          largest = {
            document: spineItem.document,
            index: spineItem.index,
            size,
          }
      }
    }

    if (!largest) throw new Error("no fixture")

    const texts = textNodesOf(largest.document)
    const started = performance.now()
    const pointers = texts.map((text) =>
      generateXPointer(
        { node: text, offset: Math.floor(text.data.length / 2) },
        largest.index,
      ),
    )
    const generated = performance.now()

    for (const pointer of pointers) {
      if (pointer) resolveXPointer(pointer, largest.document)
    }

    const resolved = performance.now()
    const perGenerate = (generated - started) / texts.length
    const perResolve = (resolved - generated) / texts.length

    console.info(
      `largest chapter: ${texts.length} text nodes, ${perGenerate.toFixed(3)} ms per generate, ${perResolve.toFixed(3)} ms per resolve`,
    )
    // an O(n^2) walk over a chapter of thousands of nodes would take seconds
    expect(perGenerate).toBeLessThan(5)
    expect(perResolve).toBeLessThan(5)
  })
})
