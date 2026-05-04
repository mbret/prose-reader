import type { XmlElement } from "xmldoc"
import { XmlDocument } from "xmldoc"
import type { ComicInfoManga } from "./manga"

/** Canonical top-level filename; real archives may use any casing. */
export const COMIC_INFO_FILENAME = "ComicInfo.xml"

/**
 * Parsed `ComicInfo.xml` root: one optional string property per child element,
 * using the same names as in the file (e.g. `Title`, `GTIN`, `LanguageISO`).
 * Nested blocks such as `Pages` are skipped. Other simple child elements are
 * still copied onto this object under their tag name.
 *
 * @see https://anansi-project.github.io/docs/comicinfo/intro
 * @see https://github.com/anansi-project/comicinfo/blob/main/drafts/v2.1/ComicInfo.xsd for schema
 */
export interface ComicInfo {
  readonly kind: "comicInfo"
  AgeRating?: string
  AlternateCount?: string
  AlternateNumber?: string
  AlternateSeries?: string
  BlackAndWhite?: string
  Characters?: string
  Colorist?: string
  CommunityRating?: string
  Count?: string
  CoverArtist?: string
  Day?: string
  Editor?: string
  Format?: string
  Genre?: string
  GTIN?: string
  Imprint?: string
  Inker?: string
  LanguageISO?: string
  Letterer?: string
  Locations?: string
  MainCharacterOrTeam?: string
  /** Schema literals per {@link ComicInfoManga}; files may still use other strings. */
  Manga?: ComicInfoManga | (string & {})
  Month?: string
  Notes?: string
  Number?: string
  PageCount?: string
  Penciller?: string
  Publisher?: string
  Review?: string
  ScanInformation?: string
  Series?: string
  SeriesGroup?: string
  StoryArc?: string
  StoryArcNumber?: string
  Summary?: string
  Tags?: string
  Teams?: string
  Title?: string
  Translator?: string
  Volume?: string
  Web?: string
  Writer?: string
  Year?: string
  [tag: string]: string | undefined
}

const SKIP_ELEMENT_CHILDREN = new Set(["Pages", "ComicInfo"])

const hasNestedElement = (el: XmlElement) =>
  el.children.some((c) => c.type === "element")

const trimmedText = (el: XmlElement): string | undefined => {
  const t = el.val.trim()
  return t.length > 0 ? t : undefined
}

/**
 * Parse a raw `ComicInfo.xml` body. Each direct child element with plain text
 * becomes a property named after that tag. Malformed XML throws; the parser
 * error is attached as `cause`.
 */
export const parseComicInfo = (xml: string): ComicInfo => {
  let doc: XmlDocument
  try {
    doc = new XmlDocument(xml)
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : String(cause)
    throw new Error(`${COMIC_INFO_FILENAME} is malformed: ${message}`, {
      cause,
    })
  }

  const fields: Record<string, string> = {}

  doc.eachChild((child) => {
    if (child.type !== "element") return
    if (SKIP_ELEMENT_CHILDREN.has(child.name)) return
    if (hasNestedElement(child)) return

    const text = trimmedText(child)
    if (text === undefined) return
    if (fields[child.name] !== undefined) return

    fields[child.name] = text
  })

  // `as ComicInfo`: TS cannot infer that spreading `Record<string, string>` into `{ kind }` satisfies the named optional fields plus `[tag: string]: string | undefined` on `ComicInfo`.
  return { kind: "comicInfo", ...fields } as ComicInfo
}
