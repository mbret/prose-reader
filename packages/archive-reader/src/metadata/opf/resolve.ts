import type {
  MetadataIdentifier,
  ResolvedCollection,
  ResolvedContributor,
  ResolvedContributorRole,
  ResolvedMetadata,
  ResolvedMetadataHomes,
  ResolvedTitle,
} from "../../types/resolvedMetadata.ts"
import { normalizeGtin } from "../../utils/normalizeGtin.ts"
import { normalizeIsbn } from "../../utils/normalizeIsbn.ts"
import { omitUndefined } from "../../utils/omitUndefined.ts"
import { parseW3cDtfDate } from "../../utils/parseW3cDtfDate.ts"
import type { OpfIdentifier, OpfMetadata, OpfMetaEntry } from "./parse.ts"

/**
 * Losslessness contract: where every parsed OPF field lands. Structural
 * fields belong to sibling parts of the resolved archive entity
 * (`readingOrder`, `toc`); `cover` and `guide` are reserved homes not yet
 * promoted out of `sources`. `metas` is the open-world case: the whole list
 * is copied verbatim into `properties`, so unknown vocabularies (calibre
 * columns, vendor namespaces…) are lossless by construction while known
 * properties (`rendition:*`, `belongs-to-collection`, roles…) additionally
 * get promoted into real vocabulary fields.
 */
export const opfMetadataHomes = {
  manifestItems: "readingOrder",
  spineRows: "readingOrder",
  spineTocIdref: "toc",
  identifiers: "identifiers",
  titles: "titles",
  creators: "contributors",
  contributors: "contributors",
  publisher: "publication.edition.publisher",
  description: "description",
  rights: "rights",
  languages: "languages",
  subjects: "subjects",
  date: "publication.edition.date",
  coverHref: "cover",
  renditionLayoutMeta: "renditionLayout",
  renditionFlowMeta: "renditionFlow",
  renditionSpreadMeta: "renditionSpread",
  pageProgressionDirection: "readingDirection",
  guide: "guide",
  metas: "properties",
} as const satisfies Record<
  Exclude<keyof OpfMetadata, "kind">,
  ResolvedMetadataHomes
>

const inferredIdentifierScheme = (value: string): string => {
  const trimmed = value.trim()

  if (/^https?:\/\//i.test(trimmed)) {
    try {
      const url = new URL(trimmed)

      if (
        (url.protocol === "http:" || url.protocol === "https:") &&
        url.hostname.length > 0
      ) {
        return "URL"
      }
    } catch {
      // Continue with identifier-specific inference.
    }
  }

  const isbn = normalizeIsbn(trimmed)

  if (isbn !== undefined && (isbn.length === 10 || /^97[89]/.test(isbn))) {
    return "ISBN"
  }
  if (normalizeGtin(trimmed) !== undefined) return "GTIN"

  return "Unknown"
}

const normalizedIdentifierScheme = (scheme: string): string => {
  switch (scheme.trim().toLowerCase()) {
    case "isbn":
      return "ISBN"
    case "gtin":
      return "GTIN"
    case "doi":
      return "DOI"
    case "googlebooks":
      return "GoogleBooks"
    case "openlibrary":
      return "OpenLibrary"
    case "projectgutenberg":
      return "ProjectGutenberg"
    case "url":
      return "URL"
    case "unknown":
      return "Unknown"
    default:
      return scheme.trim()
  }
}

/**
 * Common MARC relator codes normalized into the Readium role vocabulary;
 * anything else passes through verbatim (losslessness beats guessing).
 * @see https://www.loc.gov/marc/relators/relaterm.html
 */
const MARC_RELATOR_TO_ROLE: Readonly<
  Partial<Record<string, ResolvedContributorRole>>
> = {
  art: "artist",
  aut: "author",
  clr: "colorist",
  ctb: "contributor",
  edt: "editor",
  ill: "illustrator",
  nrt: "narrator",
  trl: "translator",
}

const contributorsFromOpf = (input: OpfMetadata): ResolvedContributor[] =>
  // `contributors` already covers every dc:creator (the `creators` list is
  // the plain-text view of the same elements), so it is the single source.
  input.contributors.map((contributor) => {
    const roles = contributor.roles.map(
      (token) => MARC_RELATOR_TO_ROLE[token.trim().toLowerCase()] ?? token,
    )

    return omitUndefined({
      name: contributor.name,
      roles:
        roles.length > 0
          ? roles
          : // a role-less dc:creator means author per EPUB 2 semantics; a
            // role-less dc:contributor is the generic Readium `contributor`
            [
              contributor.source === "creator"
                ? ("author" as const)
                : ("contributor" as const),
            ],
      sortAs: contributor.fileAs,
    })
  })

/** Same missing-`#` tolerance as the refines matching in parse.ts. */
const metaRefinesId = (meta: OpfMetaEntry, id: string): boolean =>
  meta.refines !== undefined && meta.refines.replace(/^#/, "") === id

const ONIX_CODE_LIST_5_IDENTIFIER_TYPES: Readonly<Record<string, string>> = {
  "02": "ISBN",
  "03": "GTIN",
  "04": "UPC",
  "05": "ISMN",
  "06": "DOI",
  "13": "LCCN",
  "14": "GTIN",
  "15": "ISBN",
  "22": "URN",
  "23": "OCLC",
  "24": "ISBN",
  "25": "ISMN",
  "26": "DOI",
  "34": "GTIN",
  "35": "ARK",
}

const normalizedIdentifierType = (
  meta: OpfMetaEntry | undefined,
): string | undefined => {
  const value = meta?.value?.trim()

  if (value === undefined || value.length === 0) return undefined
  if (meta?.scheme?.trim().toLowerCase() !== "onix:codelist5") return value

  return ONIX_CODE_LIST_5_IDENTIFIER_TYPES[value] ?? value
}

const refinedIdentifierType = (
  identifier: OpfIdentifier,
  metas: ReadonlyArray<OpfMetaEntry>,
): string | undefined => {
  const id = identifier.id

  if (id === undefined) return undefined

  return normalizedIdentifierType(
    metas.find(
      (meta) =>
        meta.property === "identifier-type" &&
        metaRefinesId(meta, id) &&
        meta.value !== undefined,
    ),
  )
}

const parseDecimal = (raw: string | undefined): number | undefined => {
  const trimmed = raw?.trim()
  if (trimmed === undefined || !/^\d+(\.\d+)?$/.test(trimmed)) return undefined
  const n = Number.parseFloat(trimmed)
  return Number.isFinite(n) ? n : undefined
}

const parseNonNegativeInt = (raw: string | undefined): number | undefined => {
  const trimmed = raw?.trim()
  if (trimmed === undefined || !/^\d+$/.test(trimmed)) return undefined
  const n = Number.parseInt(trimmed, 10)
  return Number.isFinite(n) ? n : undefined
}

const trimToUndefined = (raw: string | undefined): string | undefined => {
  const trimmed = raw?.trim()

  return trimmed !== undefined && trimmed.length > 0 ? trimmed : undefined
}

/** The value of the `meta refines="#id"` entry stating `property`. */
const refiningValue = (
  metas: ReadonlyArray<OpfMetaEntry>,
  id: string | undefined,
  property: string,
): string | undefined =>
  id === undefined
    ? undefined
    : metas.find(
        (meta) =>
          metaRefinesId(meta, id) &&
          meta.property === property &&
          meta.value !== undefined,
      )?.value

/**
 * EPUB 3 states a multipart title as several `dc:title` elements refined
 * with `title-type`, `display-seq` and `file-as`. All of them are kept, in
 * document order — the order matters, since the spec makes the first one the
 * main title whatever the refinements say (see `mainTitle`).
 */
const titlesFromOpf = (input: OpfMetadata): ResolvedTitle[] =>
  input.titles.map((title) =>
    omitUndefined({
      value: title.value,
      type: trimToUndefined(
        refiningValue(input.metas, title.id, "title-type"),
      )?.toLowerCase(),
      displaySeq: parseNonNegativeInt(
        refiningValue(input.metas, title.id, "display-seq"),
      ),
      sortAs: trimToUndefined(refiningValue(input.metas, title.id, "file-as")),
    }),
  )

/**
 * A collection can be identified as well as named: `dcterms:identifier`
 * refines the `belongs-to-collection` meta, and an `identifier-type`
 * refinement of that identifier names its scheme.
 */
const collectionIdentifiers = (
  metas: ReadonlyArray<OpfMetaEntry>,
  id: string | undefined,
): ReadonlyArray<MetadataIdentifier> | undefined => {
  if (id === undefined) return undefined

  const identifiers = metas.flatMap<MetadataIdentifier>((meta) => {
    if (!metaRefinesId(meta, id) || meta.property !== "dcterms:identifier") {
      return []
    }

    const value = trimToUndefined(meta.value)

    if (value === undefined) return []

    const declaredType = normalizedIdentifierType(
      metas.find(
        (candidate) =>
          meta.id !== undefined &&
          metaRefinesId(candidate, meta.id) &&
          candidate.property === "identifier-type",
      ),
    )

    return [
      {
        value,
        scheme: normalizedIdentifierScheme(
          declaredType ?? inferredIdentifierScheme(value),
        ),
      },
    ]
  })

  return identifiers.length > 0 ? identifiers : undefined
}

/**
 * Series/collection membership from the metas: EPUB 3
 * `belongs-to-collection` (a `collection-type` refine of `series` selects
 * the series bucket, anything else — including untyped — is a plain
 * collection), with the calibre `calibre:series`/`calibre:series_index`
 * name/content pair as fallback when no EPUB 3 series entry exists.
 */
const collectionsFromOpfMetas = (
  metas: ReadonlyArray<OpfMetaEntry>,
): { series: ResolvedCollection[]; collection: ResolvedCollection[] } => {
  const series: ResolvedCollection[] = []
  const collection: ResolvedCollection[] = []

  for (const meta of metas) {
    if (meta.property !== "belongs-to-collection" || meta.value === undefined)
      continue

    const id = meta.id
    const refining = (property: string): string | undefined =>
      refiningValue(metas, id, property)

    const type = refining("collection-type")?.trim().toLowerCase()
    const entry = omitUndefined({
      name: meta.value,
      identifiers: collectionIdentifiers(metas, id),
      position: parseDecimal(refining("group-position")),
    })

    if (type === "series") series.push(entry)
    else collection.push(entry)
  }

  if (series.length === 0) {
    const calibreSeries = metas.find(
      (meta) =>
        meta.name?.toLowerCase() === "calibre:series" &&
        meta.content !== undefined,
    )?.content

    if (calibreSeries !== undefined) {
      series.push(
        omitUndefined({
          name: calibreSeries,
          position: parseDecimal(
            metas.find(
              (meta) => meta.name?.toLowerCase() === "calibre:series_index",
            )?.content,
          ),
        }),
      )
    }
  }

  return { series, collection }
}

const validatedRenditionFlow = (
  raw: string | undefined,
): ResolvedMetadata["renditionFlow"] => {
  const v = raw?.trim()
  if (
    v === "scrolled-continuous" ||
    v === "scrolled-doc" ||
    v === "paginated" ||
    v === "auto"
  ) {
    return v
  }
  return undefined
}

const validatedRenditionSpread = (
  raw: string | undefined,
): ResolvedMetadata["renditionSpread"] => {
  const v = raw?.trim()
  if (
    v === "none" ||
    v === "landscape" ||
    v === "portrait" ||
    v === "both" ||
    v === "auto"
  ) {
    return v
  }
  return undefined
}

export const resolveOpf = (input: OpfMetadata): ResolvedMetadata => {
  const ppd = input.pageProgressionDirection?.trim().toLowerCase()
  const readingDirection = ppd === "ltr" || ppd === "rtl" ? ppd : undefined

  const rl = input.renditionLayoutMeta?.trim().toLowerCase()
  const renditionLayout =
    rl === "reflowable" || rl === "pre-paginated" ? rl : undefined

  const contributors = contributorsFromOpf(input)
  const titles = titlesFromOpf(input)
  const { series, collection } = collectionsFromOpfMetas(input.metas)

  const belongsTo =
    series.length > 0 || collection.length > 0
      ? omitUndefined({
          series: series.length > 0 ? series : undefined,
          collection: collection.length > 0 ? collection : undefined,
        })
      : undefined
  const edition = omitUndefined({
    date: parseW3cDtfDate(input.date),
    publisher: input.publisher,
  })

  return omitUndefined({
    titles: titles.length > 0 ? titles : undefined,
    description: input.description,
    publication:
      edition.date !== undefined || edition.publisher !== undefined
        ? { edition }
        : undefined,
    rights: input.rights,
    languages: input.languages.length > 0 ? [...input.languages] : undefined,
    subjects: input.subjects.length > 0 ? [...input.subjects] : undefined,
    contributors: contributors.length > 0 ? contributors : undefined,
    readingDirection,
    renditionLayout,
    renditionFlow: validatedRenditionFlow(input.renditionFlowMeta),
    renditionSpread: validatedRenditionSpread(input.renditionSpreadMeta),
    identifiers:
      input.identifiers.length > 0
        ? input.identifiers.map((identifier) =>
            omitUndefined({
              value: identifier.value,
              scheme: normalizedIdentifierScheme(
                identifier.scheme ??
                  refinedIdentifierType(identifier, input.metas) ??
                  inferredIdentifierScheme(identifier.value),
              ),
              unique: identifier.unique,
            }),
          )
        : undefined,
    belongsTo,
    properties: input.metas.length > 0 ? [...input.metas] : undefined,
  })
}
