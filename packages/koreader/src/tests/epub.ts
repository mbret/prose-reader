import { readFile } from "node:fs/promises"
import { join } from "node:path"
import JSZip from "jszip"
import { parseSvgDocument, parseXhtml } from "./dom"

export const FIXTURES_DIR = join(__dirname, "fixtures")

export type FixtureSpineItem = {
  index: number
  id: string
  href: string
  mediaType: string
  linear: boolean
  document: Document
}

export type FixtureBook = {
  name: string
  spineItems: FixtureSpineItem[]
}

const resolvePath = (base: string, href: string) => {
  const segments = base.split("/").slice(0, -1)

  for (const part of href.split("/")) {
    if (part === "..") segments.pop()
    else if (part !== ".") segments.push(part)
  }

  return segments.join("/")
}

/**
 * Opens a fixture EPUB the way a test needs it: every spine item, in
 * `<itemref>` order, parsed as prose's frames would (XML).
 */
export const openFixtureBook = async (name: string): Promise<FixtureBook> => {
  const zip = await JSZip.loadAsync(
    await readFile(join(FIXTURES_DIR, `${name}.epub`)),
  )
  const read = async (path: string) => {
    const file = zip.file(path)

    if (!file) throw new Error(`${name}: missing ${path}`)

    return file.async("string")
  }

  const container = parseXhtml(await read("META-INF/container.xml"))
  const opfPath = container
    .getElementsByTagName("rootfile")[0]
    ?.getAttribute("full-path")

  if (!opfPath) throw new Error(`${name}: no rootfile`)

  const opf = parseXhtml(await read(opfPath))
  const items = new Map(
    Array.from(opf.getElementsByTagName("item")).map((item) => [
      item.getAttribute("id") ?? "",
      {
        href: item.getAttribute("href") ?? "",
        mediaType: item.getAttribute("media-type") ?? "",
      },
    ]),
  )
  const spineItems: FixtureSpineItem[] = []

  for (const itemref of Array.from(opf.getElementsByTagName("itemref"))) {
    const id = itemref.getAttribute("idref") ?? ""
    const item = items.get(id)

    if (!item) throw new Error(`${name}: itemref ${id} has no item`)

    const path = resolvePath(opfPath, item.href)
    const source = await read(path)
    const document =
      item.mediaType === "image/svg+xml"
        ? parseSvgDocument(source)
        : parseXhtml(source)

    spineItems.push({
      index: spineItems.length,
      id,
      href: item.href,
      mediaType: item.mediaType,
      linear: itemref.getAttribute("linear") !== "no",
      document,
    })
  }

  return { name, spineItems }
}

export type OracleWord = [xp: string, xpEnd: string, text: string]

export type OracleFragment = {
  index: number
  wordCount: number
  words: OracleWord[]
}

/**
 * What tools/xpointer-oracle.lua dumped from KOReader's crengine for the
 * fixture: for a sample of visible words in each spine item, crengine's own
 * pointers to the word's start and end and the text between them.
 */
export type Oracle = {
  epub: string
  domVersion: number
  stylesheet: string
  every: number
  fragments: OracleFragment[]
}

export const readOracle = async (name: string): Promise<Oracle> =>
  JSON.parse(
    await readFile(join(FIXTURES_DIR, `${name}.crengine.json`), "utf-8"),
  )

/**
 * crengine hands MathML identifiers back as mathematical italic letters
 * (`x` as U+1D465); fold them so the words can be compared to the source.
 */
export const foldMathItalic = (text: string) =>
  Array.from(text)
    .map((char) => {
      const codePoint = char.codePointAt(0) ?? 0

      if (codePoint >= 0x1d434 && codePoint <= 0x1d44d)
        return String.fromCodePoint(codePoint - 0x1d434 + 65)
      if (codePoint >= 0x1d44e && codePoint <= 0x1d467)
        return String.fromCodePoint(codePoint - 0x1d44e + 97)
      if (codePoint === 0x210e) return "h"

      return char
    })
    .join("")

/** Text as crengine hands it back: soft hyphens gone, whitespace collapsed, math italics folded. */
export const normalizeText = (text: string) =>
  foldMathItalic(text)
    .replace(/\u00ad/g, "")
    .replace(/\s+/g, " ")
    .trim()

/**
 * Fixture positions where crengine's DOM differs from the DOM for a reason
 * this package does not model, all in the synthetic fixture on purpose:
 *
 * - `display` or `white-space` set by CSS (an inline style, a class):
 *   crengine applies the book's stylesheet, this package only knows the
 *   defaults, and the pointers differ by one text node;
 * - spaces written as `&#32;`: crengine decodes entities after its
 *   whitespace pass, so they are not collapsed there;
 * - a text node longer than 8192 characters holding entity references:
 *   crengine splits the source, where `&amp;` is five characters.
 *
 * Pointer prefixes, `fixture:pointer`.
 */
export const KNOWN_DEVIATIONS = [
  "synthetic:/body/DocFragment[2]/body/span[2]/",
  "synthetic:/body/DocFragment[2]/body/span[2].",
  "synthetic:/body/DocFragment[2]/body/span[3]/",
  "synthetic:/body/DocFragment[2]/body/span[3].",
  "synthetic:/body/DocFragment[2]/body/div[2]/",
  "synthetic:/body/DocFragment[2]/body/div[2].",
  "synthetic:/body/DocFragment[2]/body/div[3]/",
  "synthetic:/body/DocFragment[2]/body/div[3].",
  "synthetic:/body/DocFragment[2]/body/div[10]/",
  "synthetic:/body/DocFragment[2]/body/div[10].",
  "synthetic:/body/DocFragment[3]/body/p[3]/text()",
  "synthetic:/body/DocFragment[5]/body/p[6]/text()[",
]

export const isKnownDeviation = (fixture: string, pointer: string) =>
  KNOWN_DEVIATIONS.some((prefix) => `${fixture}:${pointer}`.startsWith(prefix))
