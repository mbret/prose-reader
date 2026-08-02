import type {
  ResolvedDate,
  ResolvedMetadata,
  ResolvedPublication,
} from "@prose-reader/archive-reader"

/**
 * A request body is third-party data, and the fetcher trusts its input
 * (`metadata.title.trim()`), so `{"title": 42}` would be a 500. Everything
 * here is read through a guard, and only the fields a lookup searches on are
 * kept — the rest of a `ResolvedArchive` is dropped rather than rejected, so
 * one can be posted verbatim.
 */

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value)

const readString = (
  record: Record<string, unknown>,
  key: string,
): string | undefined => {
  const value = record[key]

  if (typeof value !== "string") return undefined

  const trimmed = value.trim()

  return trimmed.length > 0 ? trimmed : undefined
}

const readNumber = (
  record: Record<string, unknown>,
  key: string,
): number | undefined => {
  const value = record[key]

  return typeof value === "number" && Number.isFinite(value) ? value : undefined
}

const readStringArray = (
  record: Record<string, unknown>,
  key: string,
): string[] | undefined => {
  const value = record[key]

  if (!Array.isArray(value)) return undefined

  const strings = value
    .filter((entry): entry is string => typeof entry === "string")
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0)

  return strings.length > 0 ? strings : undefined
}

const readRecordArray = (
  record: Record<string, unknown>,
  key: string,
): ReadonlyArray<Record<string, unknown>> => {
  const value = record[key]

  return Array.isArray(value) ? value.filter(isRecord) : []
}

const readContributors = (
  record: Record<string, unknown>,
): ResolvedMetadata["contributors"] => {
  const contributors = readRecordArray(record, "contributors").flatMap(
    (entry) => {
      const name = readString(entry, "name")

      if (name === undefined) return []

      return [{ name, roles: readStringArray(entry, "roles") ?? [] }]
    },
  )

  return contributors.length > 0 ? contributors : undefined
}

const readIdentifiers = (
  record: Record<string, unknown>,
): ResolvedMetadata["identifiers"] => {
  type ResolvedIdentifier = NonNullable<ResolvedMetadata["identifiers"]>[number]

  const identifiers = readRecordArray(
    record,
    "identifiers",
  ).flatMap<ResolvedIdentifier>((entry) => {
    const value = readString(entry, "value")

    if (value === undefined) return []

    const scheme = readString(entry, "scheme")

    return [
      {
        value,
        ...(scheme !== undefined ? { scheme } : {}),
        ...(entry.unique === true ? { unique: true } : {}),
      },
    ]
  })

  return identifiers.length > 0 ? identifiers : undefined
}

const readCollections = (
  record: Record<string, unknown>,
  key: string,
): ReadonlyArray<{ name: string; position?: number }> | undefined => {
  const collections = readRecordArray(record, key).flatMap((entry) => {
    const name = readString(entry, "name")

    if (name === undefined) return []

    const position = readNumber(entry, "position")

    return [position !== undefined ? { name, position } : { name }]
  })

  return collections.length > 0 ? collections : undefined
}

const readDate = (value: unknown): ResolvedDate | undefined => {
  if (!isRecord(value)) return undefined

  const year = readNumber(value, "year")
  const month = readNumber(value, "month")
  const day = readNumber(value, "day")

  if (year === undefined && month === undefined && day === undefined) {
    return undefined
  }

  return {
    ...(year !== undefined ? { year } : {}),
    ...(month !== undefined ? { month } : {}),
    ...(day !== undefined ? { day } : {}),
  }
}

const readPublicationPart = (
  value: unknown,
): ResolvedPublication | undefined => {
  if (!isRecord(value)) return undefined

  const date = readDate(value.date)
  const publisher = readString(value, "publisher")
  const imprint = readString(value, "imprint")

  if (date === undefined && publisher === undefined && imprint === undefined) {
    return undefined
  }

  return {
    ...(date !== undefined ? { date } : {}),
    ...(publisher !== undefined ? { publisher } : {}),
    ...(imprint !== undefined ? { imprint } : {}),
  }
}

const readPublication = (
  record: Record<string, unknown>,
): ResolvedMetadata["publication"] => {
  if (!isRecord(record.publication)) return undefined

  const original = readPublicationPart(record.publication.original)
  const edition = readPublicationPart(record.publication.edition)

  if (original === undefined && edition === undefined) return undefined

  return {
    ...(original !== undefined ? { original } : {}),
    ...(edition !== undefined ? { edition } : {}),
  }
}

const readBelongsTo = (
  record: Record<string, unknown>,
): ResolvedMetadata["belongsTo"] => {
  const belongsTo = record.belongsTo

  if (!isRecord(belongsTo)) return undefined

  const series = readCollections(belongsTo, "series")
  const collection = readCollections(belongsTo, "collection")

  if (series === undefined && collection === undefined) return undefined

  return {
    ...(series !== undefined ? { series } : {}),
    ...(collection !== undefined ? { collection } : {}),
  }
}

const omitUndefined = <T extends object>(obj: T): T => {
  const entries = Object.entries(obj).filter(([, value]) => value !== undefined)

  // `as T`: Object.entries/fromEntries erase the key–value pairing; filtering
  // only drops `undefined` values, which `T`'s optional fields already allow.
  return Object.fromEntries(entries) as T
}

/**
 * Accepts a bare `ResolvedMetadata` or anything carrying one under `metadata`
 * — the `ResolvedArchive` shape. `undefined` when the body is not a JSON
 * object at all; anything else degrades field by field.
 */
export const parseMetadataInput = (
  body: unknown,
): ResolvedMetadata | undefined => {
  if (!isRecord(body)) return undefined

  const record = isRecord(body.metadata) ? body.metadata : body

  return omitUndefined({
    title: readString(record, "title"),
    isbn: readString(record, "isbn"),
    gtin: readString(record, "gtin"),
    languages: readStringArray(record, "languages"),
    subjects: readStringArray(record, "subjects"),
    numberOfPages: readNumber(record, "numberOfPages"),
    contributors: readContributors(record),
    identifiers: readIdentifiers(record),
    publication: readPublication(record),
    belongsTo: readBelongsTo(record),
  })
}
