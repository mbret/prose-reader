import type {
  MetadataIdentifier,
  ResolvedContributor,
  ResolvedContributorRole,
  ResolvedCover,
  ResolvedDate,
  ResolvedMetadata,
  ResolvedMetadataHome,
  ResolvedPublication,
} from "@prose-reader/archive-reader"
import { omitUndefined } from "../../utils/omitUndefined.ts"
import { PROJECT_GUTENBERG_IDENTIFIER_SCHEME } from "./identifier.ts"
import type { ProjectGutenbergRecord } from "./parse.ts"

export const PROJECT_GUTENBERG_MAX_SUBJECTS = 25

/** Compile-enforced map from every parsed RDF field to its resolved home. */
export const projectGutenbergMetadataHomes = {
  id: "identifiers",
  title: "title",
  publisher: "publication.edition.publisher",
  issued: "publication.edition.date",
  originalPublication: "publication.original",
  rights: "rights",
  description: "description",
  summary: "description",
  languages: "languages",
  subjects: "subjects",
  bookshelves: "subjects",
  contributors: "contributors",
  cover: "cover",
} as const satisfies Record<
  keyof ProjectGutenbergRecord,
  ResolvedMetadataHome | "identifiers"
>

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

const resolvedContributors = (
  record: ProjectGutenbergRecord,
): ReadonlyArray<ResolvedContributor> | undefined => {
  const contributors = new Map<string, { name: string; roles: string[] }>()

  for (const contributor of record.contributors ?? []) {
    const key = contributor.name.trim().toLowerCase()
    const role =
      MARC_RELATOR_TO_ROLE[contributor.role.trim().toLowerCase()] ??
      contributor.role
    const existing = contributors.get(key)

    if (existing === undefined) {
      contributors.set(key, { name: contributor.name, roles: [role] })
    } else if (!existing.roles.includes(role)) {
      existing.roles.push(role)
    }
  }

  return contributors.size > 0 ? [...contributors.values()] : undefined
}

const resolvedIssuedDate = (
  issued: string | undefined,
): ResolvedDate | undefined => {
  if (issued === undefined) return undefined

  const match = /^(\d{4})(?:-(\d{2})(?:-(\d{2}))?)?$/.exec(issued.trim())

  if (match === null) return undefined

  const year = Number(match[1])
  const month = match[2] !== undefined ? Number(match[2]) : undefined
  const day = match[3] !== undefined ? Number(match[3]) : undefined

  if (
    !Number.isInteger(year) ||
    year <= 0 ||
    (month !== undefined && (month < 1 || month > 12)) ||
    (day !== undefined && (day < 1 || day > 31))
  ) {
    return undefined
  }

  return {
    year,
    ...(month !== undefined ? { month } : {}),
    ...(day !== undefined ? { day } : {}),
  }
}

const marc260Subfields = (
  statement: string,
  code: string,
): ReadonlyArray<string> =>
  statement
    .split("$")
    .slice(1)
    .flatMap((subfield) =>
      subfield[0]?.toLowerCase() === code.toLowerCase()
        ? [subfield.slice(1).trim()]
        : [],
    )
    .filter((value) => value.length > 0)

const originalPublicationFromMarc260 = (
  statement: string | undefined,
): ResolvedPublication | undefined => {
  if (statement === undefined) return undefined

  const publisherValues = marc260Subfields(statement, "b")
  const rawPublisher =
    publisherValues.length === 1 ? publisherValues[0] : undefined
  const publisher = rawPublisher?.replace(/[\s,;:/]+$/u, "").trim()
  const dateValues = marc260Subfields(statement, "c")
  const years = [
    ...new Set(
      dateValues.flatMap((value) =>
        [...value.matchAll(/\d{4}/g)].flatMap((match) =>
          match[0] !== undefined ? [Number(match[0])] : [],
        ),
      ),
    ),
  ]
  const date = years.length === 1 ? { year: years[0] } : undefined
  const details = omitUndefined({
    date,
    publisher:
      publisher !== undefined &&
      publisher.length > 0 &&
      !/^\[?s\.n\.?\]?$/i.test(publisher)
        ? publisher
        : undefined,
  })

  return details.date !== undefined || details.publisher !== undefined
    ? details
    : undefined
}

const absoluteHttpUrl = (
  value: string,
  baseUrl: string,
): string | undefined => {
  try {
    const url = new URL(value, baseUrl)

    return url.protocol === "http:" || url.protocol === "https:"
      ? url.toString()
      : undefined
  } catch {
    return undefined
  }
}

const emptyToUndefined = <T>(
  values: ReadonlyArray<T>,
): ReadonlyArray<T> | undefined => (values.length > 0 ? values : undefined)

export const resolveProjectGutenbergRecord = (
  record: ProjectGutenbergRecord,
  options: {
    readonly baseUrl: string
    readonly matchedIdentifier: MetadataIdentifier
  },
): ResolvedMetadata => {
  const identifiers = [
    options.matchedIdentifier,
    { value: record.id, scheme: PROJECT_GUTENBERG_IDENTIFIER_SCHEME },
  ].filter(
    (identifier, index, all) =>
      all.findIndex(
        (other) =>
          other.value.trim().toLowerCase() ===
            identifier.value.trim().toLowerCase() &&
          other.scheme.trim().toLowerCase() ===
            identifier.scheme.trim().toLowerCase(),
      ) === index,
  )
  const subjects = [
    ...new Set([...(record.subjects ?? []), ...(record.bookshelves ?? [])]),
  ].slice(0, PROJECT_GUTENBERG_MAX_SUBJECTS)
  const coverUri =
    record.cover !== undefined
      ? absoluteHttpUrl(record.cover.uri, options.baseUrl)
      : undefined
  const cover: ResolvedCover | undefined =
    coverUri !== undefined
      ? {
          uri: coverUri,
          mediaType: record.cover?.mediaType,
          confidence: "derived",
        }
      : undefined
  const edition = omitUndefined({
    date: resolvedIssuedDate(record.issued),
    publisher: record.publisher,
  })
  const original = originalPublicationFromMarc260(record.originalPublication)
  const publication = omitUndefined({
    original,
    edition:
      edition.date !== undefined || edition.publisher !== undefined
        ? edition
        : undefined,
  })

  return omitUndefined({
    title: record.title,
    publication:
      publication.original !== undefined || publication.edition !== undefined
        ? publication
        : undefined,
    description: record.summary ?? record.description,
    rights: record.rights,
    languages: emptyToUndefined([...new Set(record.languages ?? [])]),
    subjects: emptyToUndefined(subjects),
    contributors: resolvedContributors(record),
    identifiers,
    cover,
  })
}
