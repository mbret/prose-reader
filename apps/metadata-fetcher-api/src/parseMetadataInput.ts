import type { ResolvedMetadata } from "@prose-reader/archive-reader"

/**
 * A request body is third-party data, and the fetcher's query builder trusts
 * its input (`metadata.title.trim()`): handing it a raw body would turn
 * `{"title": 42}` into a 500. So the boundary reads the body through guards
 * and keeps only the fields a lookup actually searches on — everything else
 * (`readingOrder`, `properties`, the format-scoped corners…) is dropped, not
 * rejected, so posting a whole `ResolvedArchive` just works.
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
  const identifiers = readRecordArray(record, "identifiers").flatMap(
    (entry) => {
      const value = readString(entry, "value")

      if (value === undefined) return []

      const scheme = readString(entry, "scheme")

      return [scheme !== undefined ? { value, scheme } : { value }]
    },
  )

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

const readPublished = (
  record: Record<string, unknown>,
): ResolvedMetadata["published"] => {
  const published = record.published

  if (!isRecord(published)) return undefined

  const year = readNumber(published, "year")
  const month = readNumber(published, "month")
  const day = readNumber(published, "day")

  if (year === undefined && month === undefined && day === undefined) {
    return undefined
  }

  return {
    ...(year !== undefined ? { year } : {}),
    ...(month !== undefined ? { month } : {}),
    ...(day !== undefined ? { day } : {}),
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
 * Reads a request body into the metadata to look up.
 *
 * Accepts either a bare `ResolvedMetadata` or anything carrying one under
 * `metadata` — which is the `ResolvedArchive` shape, so the output of
 * `resolveArchive` can be posted verbatim.
 *
 * Returns `undefined` when the body is not a JSON object at all; anything
 * else degrades field by field.
 */
export const parseMetadataInput = (
  body: unknown,
): ResolvedMetadata | undefined => {
  if (!isRecord(body)) return undefined

  const record = isRecord(body.metadata) ? body.metadata : body

  return omitUndefined({
    title: readString(record, "title"),
    publisher: readString(record, "publisher"),
    isbn: readString(record, "isbn"),
    gtin: readString(record, "gtin"),
    languages: readStringArray(record, "languages"),
    subjects: readStringArray(record, "subjects"),
    numberOfPages: readNumber(record, "numberOfPages"),
    contributors: readContributors(record),
    identifiers: readIdentifiers(record),
    published: readPublished(record),
    belongsTo: readBelongsTo(record),
  })
}
