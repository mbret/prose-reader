/**
 * Cross-format hints for manifest-style consumers (identifiers, reading order,
 * fixed-layout, descriptive metadata). Every field is populated by every
 * `resolve*` — values default to `undefined` when the source format has no
 * equivalent or the input is missing/blank, so consumers see a stable shape
 * regardless of which container they're reading. Empty arrays/strings collapse
 * to `undefined` so `result.field !== undefined` is a reliable presence check.
 *
 * Sources are container-agnostic: the same field can come from OPF Dublin
 * Core (`dc:creator`, `dc:date`, …) or from a ComicInfo.xml element
 * (`Writer`, `Year`/`Month`/`Day`, …).
 *
 * @see https://en.wikipedia.org/wiki/ISBN
 */
export type ArchiveResolveResult = {
  /** Digits-only GTIN when the source matches a GS1 length (8 / 12 / 13 / 14). */
  gtin?: string
  isbn?: string
  readingDirection?: "ltr" | "rtl"
  renditionLayout?: "reflowable" | "pre-paginated"
  /**
   * Human-readable title of the work. OPF: `dc:title`. ComicInfo: `Title`.
   * Bare archive series naming (`Series` without `Title`) is left to the
   * consumer — the resolver doesn't fall back across container fields.
   */
  title?: string
  /**
   * Primary creators, in document order. OPF: every `dc:creator`.
   * ComicInfo: `Writer`, split on commas (the de facto schema convention).
   * Other ComicInfo roles (`Penciller`, `Inker`, …) stay on the parsed
   * object — folding them all in here would lose role attribution.
   */
  authors?: string[]
  /** OPF: first non-empty `dc:publisher`. ComicInfo: `Publisher`. */
  publisher?: string
  /**
   * Rights / copyright statement. OPF: first non-empty `dc:rights`.
   * ComicInfo has no spec'd rights field, so this is OPF-only today.
   */
  rights?: string
  /**
   * Language tags. OPF: every `dc:language` (BCP 47). ComicInfo:
   * `LanguageISO` lifted into a single-entry array; the schema is
   * single-language by design but we keep the array shape so consumers
   * can ignore the source format.
   */
  languages?: string[]
  /**
   * Calendar components extracted from the source date. Each component
   * is independently optional so partial dates (year only, year+month)
   * round-trip faithfully. OPF: `dc:date` parsed as W3CDTF. ComicInfo:
   * `Year` / `Month` / `Day` parsed as integers.
   */
  date?: {
    year?: number
    month?: number
    day?: number
  }
  /**
   * Subject keywords. OPF: every `dc:subject`. ComicInfo: `Genre`
   * followed by `Tags`, both split on commas, in that order. The schema
   * assigns slightly different intents to the two ComicInfo fields, but
   * for the cross-format "subjects" lens they're equivalent.
   */
  subjects?: string[]
}
