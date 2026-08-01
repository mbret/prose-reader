import type { XmlElement } from "xmldoc"
import { XmlDocument } from "xmldoc"
import type { ComicInfoManga } from "./manga.ts"

/** Canonical top-level filename; real archives may use any casing. */
export const COMIC_INFO_FILENAME = "ComicInfo.xml"

/**
 * Every simple child element of the ComicInfo schema (v2.1 draft), audited
 * against the XSD. `Pages` is deliberately absent (nested block, skipped by
 * the parser). This list is the single source of truth for the known keys
 * of {@link ComicInfo} and the domain of the losslessness mapping table in
 * `resolve.ts` — adding a field here without declaring its metadata home
 * there is a type error.
 *
 * @see https://github.com/anansi-project/comicinfo/blob/main/drafts/v2.1/ComicInfo.xsd
 */
export const COMIC_INFO_KNOWN_FIELDS = [
  "AgeRating",
  "AlternateCount",
  "AlternateNumber",
  "AlternateSeries",
  "BlackAndWhite",
  "Characters",
  "Colorist",
  "CommunityRating",
  "Count",
  "CoverArtist",
  "Day",
  "Editor",
  "Format",
  "Genre",
  "GTIN",
  "Imprint",
  "Inker",
  "LanguageISO",
  "Letterer",
  "Locations",
  "MainCharacterOrTeam",
  "Manga",
  "Month",
  "Notes",
  "Number",
  "PageCount",
  "Penciller",
  "Publisher",
  "Review",
  "ScanInformation",
  "Series",
  "SeriesGroup",
  "StoryArc",
  "StoryArcNumber",
  "Summary",
  "Tags",
  "Teams",
  "Title",
  "Translator",
  "Volume",
  "Web",
  "Writer",
  "Year",
] as const

export type ComicInfoKnownField = (typeof COMIC_INFO_KNOWN_FIELDS)[number]

/**
 * Parsed `ComicInfo.xml` root: one optional string property per child element,
 * using the same names as in the file (e.g. `Title`, `GTIN`, `LanguageISO`).
 * Nested blocks such as `Pages` are skipped. Other simple child elements are
 * still copied onto this object under their tag name.
 *
 * @see https://anansi-project.github.io/docs/comicinfo/intro
 * @see https://github.com/anansi-project/comicinfo/blob/main/drafts/v2.1/ComicInfo.xsd for schema
 */
export interface ComicInfo
  extends Partial<Record<ComicInfoKnownField, string>> {
  readonly kind: "comicInfo"
  /** Schema literals per {@link ComicInfoManga}; files may still use other strings. */
  Manga?: ComicInfoManga | (string & {})
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
