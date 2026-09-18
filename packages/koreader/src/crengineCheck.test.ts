import { existsSync } from "node:fs"
import { mkdir, readFile, writeFile } from "node:fs/promises"
import { join } from "node:path"
import { describe, expect, it } from "vitest"
import { getCrengineChildren, isTextNode } from "./crengine/children"
import { isElement } from "./crengine/elements"
import { generateXPointer } from "./generate"
import {
  FIXTURES_DIR,
  isKnownDeviation,
  normalizeText,
  openFixtureBook,
} from "./tests/epub"

/**
 * The second half of the ground truth: pointers this package emits, fed to
 * KOReader's crengine by tools/xpointer-check.lua, which reports whether it
 * resolves them and the text it reads between them.
 *
 * `XPOINTER_CHECK_EMIT_DIR=<dir> vitest run src/crengineCheck.test.ts` writes
 * the pairs to send (`<dir>/<fixture>.pairs.json`); the Lua script's answers,
 * saved as `src/tests/fixtures/<fixture>.crengine-check.json`, are what the
 * test asserts against. Fixtures without an answer file are skipped loudly.
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

type Pair = { xp0: string; xp1: string | null; expected: string | null }

type CheckResult = {
  xp0: string
  xp1?: string | null
  valid0: boolean
  valid1?: boolean
  text?: string
}

/** Every N-th item, and at most `limit` of them: keeps the answer files small. */
const sample = <T>(items: T[], limit: number): T[] => {
  if (items.length <= limit) return items

  const step = Math.ceil(items.length / limit)

  return items.filter((_, index) => index % step === 0)
}

/** First and last run of non-blank characters of a text node, as UTF-16 ranges. */
const wordsOf = (data: string): [number, number][] => {
  const ranges: [number, number][] = []
  const pattern = /[^\s]+/g
  let match: RegExpExecArray | null = pattern.exec(data)

  while (match) {
    ranges.push([match.index, match.index + match[0].length])
    match = pattern.exec(data)
  }

  return ranges.length > 2
    ? [ranges[0] as [number, number], ranges.at(-1) as [number, number]]
    : ranges
}

const pairsOf = async (name: string): Promise<Pair[]> => {
  const book = await openFixtureBook(name)
  const synthetic = name === "synthetic"
  const pairs: Pair[] = []

  for (const spineItem of book.spineItems) {
    const root = spineItem.document.body

    if (!root) {
      const pointer = generateXPointer(
        { node: spineItem.document.documentElement },
        spineItem.index,
      )

      if (pointer) pairs.push({ xp0: pointer, xp1: null, expected: null })

      continue
    }

    const elements = Array.from(root.querySelectorAll("*"))
    const texts: Text[] = []
    const walk = (node: Node) => {
      for (let child = node.firstChild; child; child = child.nextSibling) {
        if (isTextNode(child)) texts.push(child)
        else walk(child)
      }
    }

    walk(root)

    for (const element of sample(elements, synthetic ? 10000 : 25)) {
      const pointer = generateXPointer({ node: element }, spineItem.index)

      if (pointer) pairs.push({ xp0: pointer, xp1: null, expected: null })
    }

    const kept = texts.filter((text) => {
      const parent = text.parentNode

      return (
        parent !== null &&
        isElement(parent) &&
        getCrengineChildren(parent).some(
          (child) => child.kind === "text" && child.node === text,
        )
      )
    })

    for (const text of sample(kept, synthetic ? 10000 : 25)) {
      for (const [start, end] of wordsOf(text.data)) {
        const xp0 = generateXPointer(
          { node: text, offset: start },
          spineItem.index,
        )
        const xp1 = generateXPointer(
          { node: text, offset: end },
          spineItem.index,
        )

        if (xp0 && xp1)
          pairs.push({ xp0, xp1, expected: text.data.slice(start, end) })
      }
    }

    const parents = elements.filter((element) => element.childNodes.length > 0)

    for (const element of sample(parents, synthetic ? 10000 : 10)) {
      for (const offset of [0, element.childNodes.length]) {
        const pointer = generateXPointer(
          { node: element, offset },
          spineItem.index,
        )

        if (pointer) pairs.push({ xp0: pointer, xp1: null, expected: null })
      }
    }
  }

  return pairs
}

const emitDir = process.env.XPOINTER_CHECK_EMIT_DIR

describe.each(FIXTURES)(
  "crengine accepts what this package emits: %s",
  (name) => {
    const answers = join(FIXTURES_DIR, `${name}.crengine-check.json`)

    it("resolves every emitted pointer to the same text", async () => {
      const pairs = await pairsOf(name)

      if (emitDir) {
        await mkdir(emitDir, { recursive: true })
        await writeFile(
          join(emitDir, `${name}.pairs.json`),
          JSON.stringify({ pairs: pairs.map((pair) => [pair.xp0, pair.xp1]) }),
        )
        console.info(
          `${name}: ${pairs.length} pairs written for tools/xpointer-check.lua`,
        )

        return
      }

      if (!existsSync(answers)) {
        console.warn(
          `${name}: no crengine answers at ${answers}, run tools/xpointer-check.lua (see tools/README.md)`,
        )

        return
      }

      const results: CheckResult[] = JSON.parse(
        await readFile(answers, "utf-8"),
      ).results
      const failures: string[] = []

      expect(results.length).toBe(pairs.length)

      let skipped = 0

      pairs.forEach((pair, index) => {
        const result = results[index]

        if (isKnownDeviation(name, pair.xp0)) {
          skipped++

          return
        }

        if (
          !result ||
          result.xp0 !== pair.xp0 ||
          (result.xp1 ?? null) !== pair.xp1
        ) {
          failures.push(
            `${pair.xp0}: answers are for another pointer, regenerate them`,
          )

          return
        }

        if (!result.valid0 || (pair.xp1 !== null && !result.valid1)) {
          failures.push(
            `${pair.xp0}${pair.xp1 ? ` .. ${pair.xp1}` : ""}: crengine cannot resolve it`,
          )

          return
        }

        if (
          pair.expected !== null &&
          normalizeText(result.text ?? "") !== normalizeText(pair.expected)
        ) {
          failures.push(
            `${pair.xp0} .. ${pair.xp1}: crengine reads ${JSON.stringify(result.text)}, expected ${JSON.stringify(pair.expected)}`,
          )
        }
      })

      console.info(
        `${name}: ${pairs.length - skipped} emitted pointers checked by crengine (${skipped} known deviations skipped)`,
      )
      expect(failures.slice(0, 20)).toEqual([])
    })
  },
)
