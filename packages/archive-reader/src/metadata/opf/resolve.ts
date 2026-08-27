import type {
  MetadataIdentifier,
  ResolvedCollection,
  ResolvedContributor,
  ResolvedContributorRole,
  ResolvedMetadata,
  ResolvedTitle,
} from "../../types/resolvedMetadata.ts"
import { inferIdentifierScheme } from "../../utils/inferIdentifierScheme.ts"
import { normalizeIdentifierScheme } from "../../utils/normalizeIdentifierScheme.ts"
import { omitUndefined } from "../../utils/omitUndefined.ts"
import { parseW3cDtfDate } from "../../utils/parseW3cDtfDate.ts"
import { opfIdentifierTypeScheme } from "./identifierScheme.ts"
import type {
  OpfContributor,
  OpfIdentifier,
  OpfMetadata,
  OpfMetaEntry,
  OpfTitle,
} from "./parse.ts"

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

const contributorsFromOpf = (
  // `contributors` already covers every dc:creator (the `creators` list is
  // the plain-text view of the same elements), so it is the single source.
  parsed: ReadonlyArray<OpfContributor>,
): ResolvedContributor[] =>
  parsed.map((contributor) => {
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

const refinedIdentifierType = (
  identifier: OpfIdentifier,
  metas: ReadonlyArray<OpfMetaEntry>,
): string | undefined => {
  const id = identifier.id

  if (id === undefined) return undefined

  return opfIdentifierTypeScheme(
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
const titlesFromOpf = (
  parsed: ReadonlyArray<OpfTitle>,
  metas: ReadonlyArray<OpfMetaEntry>,
): ResolvedTitle[] =>
  parsed.map((title) =>
    omitUndefined({
      value: title.value,
      type: trimToUndefined(
        refiningValue(metas, title.id, "title-type"),
      )?.toLowerCase(),
      displaySeq: parseNonNegativeInt(
        refiningValue(metas, title.id, "display-seq"),
      ),
      sortAs: trimToUndefined(refiningValue(metas, title.id, "file-as")),
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

    const declaredType = opfIdentifierTypeScheme(
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
        scheme: normalizeIdentifierScheme(
          declaredType ?? inferIdentifierScheme(value),
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
  const {
    titles: parsedTitles,
    contributors: parsedContributors,
    publisher,
    description,
    rights,
    languages,
    subjects,
    date,
    renditionLayoutMeta,
    renditionFlowMeta,
    renditionSpreadMeta,
    pageProgressionDirection,
    identifiers: parsedIdentifiers,
    metas,
    // resolved elsewhere in the archive entity, not from the package alone:
    // the reading order, the toc, the cover and the guide
    kind: _kind,
    creators: _creators,
    manifestItems: _manifestItems,
    spineRows: _spineRows,
    spineTocIdref: _spineTocIdref,
    coverHref: _coverHref,
    guide: _guide,
    ...unhandled
  } = input

  // Naming every parsed field above is the contract: adding one to
  // `OpfMetadata` fails here until someone decides what becomes of it.
  unhandled satisfies Record<string, never>

  const ppd = pageProgressionDirection?.trim().toLowerCase()
  const readingDirection = ppd === "ltr" || ppd === "rtl" ? ppd : undefined

  const rl = renditionLayoutMeta?.trim().toLowerCase()
  const renditionLayout =
    rl === "reflowable" || rl === "pre-paginated" ? rl : undefined

  const contributors = contributorsFromOpf(parsedContributors)
  const titles = titlesFromOpf(parsedTitles, metas)
  const { series, collection } = collectionsFromOpfMetas(metas)

  const belongsTo =
    series.length > 0 || collection.length > 0
      ? omitUndefined({
          series: series.length > 0 ? series : undefined,
          collection: collection.length > 0 ? collection : undefined,
        })
      : undefined
  const edition = omitUndefined({
    date: parseW3cDtfDate(date),
    publisher,
  })

  return omitUndefined({
    titles: titles.length > 0 ? titles : undefined,
    description,
    publication:
      edition.date !== undefined || edition.publisher !== undefined
        ? { edition }
        : undefined,
    rights,
    languages: languages.length > 0 ? [...languages] : undefined,
    subjects: subjects.length > 0 ? [...subjects] : undefined,
    contributors: contributors.length > 0 ? contributors : undefined,
    readingDirection,
    renditionLayout,
    renditionFlow: validatedRenditionFlow(renditionFlowMeta),
    renditionSpread: validatedRenditionSpread(renditionSpreadMeta),
    identifiers:
      parsedIdentifiers.length > 0
        ? parsedIdentifiers.map((identifier) =>
            omitUndefined({
              value: identifier.value,
              scheme: normalizeIdentifierScheme(
                identifier.scheme ??
                  refinedIdentifierType(identifier, metas) ??
                  inferIdentifierScheme(identifier.value),
              ),
              unique: identifier.unique,
            }),
          )
        : undefined,
    belongsTo,
    properties: metas.length > 0 ? [...metas] : undefined,
  })
}
