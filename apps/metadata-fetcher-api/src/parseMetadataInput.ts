import type {
  FetchMetadataInput,
  MetadataIdentifier,
} from "@prose-reader/metadata-fetcher"

/**
 * A request body is third-party data, while the fetcher trusts its typed input.
 * Read every supported field through a guard and drop unrelated values.
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

const readIdentifiers = (
  record: Record<string, unknown>,
): ReadonlyArray<MetadataIdentifier> | undefined => {
  const value = record.identifiers

  if (!Array.isArray(value)) return undefined

  const identifiers = value.flatMap<MetadataIdentifier>((entry) => {
    if (!isRecord(entry)) return []

    const identifierValue = readString(entry, "value")

    if (identifierValue === undefined) return []

    return [
      {
        value: identifierValue,
        scheme: readString(entry, "scheme") ?? "Unknown",
      },
    ]
  })

  return identifiers.length > 0 ? identifiers : undefined
}

const omitUndefined = <T extends object>(obj: T): T => {
  const entries = Object.entries(obj).filter(([, value]) => value !== undefined)

  // `as T`: Object.entries/fromEntries erase the key–value pairing; filtering
  // only drops `undefined` values, which `T`'s optional fields already allow.
  return Object.fromEntries(entries) as T
}

/**
 * Parses the compact `FetchMetadataInput` HTTP body. `undefined` means the body
 * was not a JSON object; object fields otherwise degrade independently.
 */
export const parseMetadataInput = (
  body: unknown,
): FetchMetadataInput | undefined => {
  if (!isRecord(body)) return undefined

  return omitUndefined({
    title: readString(body, "title"),
    authors: readStringArray(body, "authors"),
    identifiers: readIdentifiers(body),
    series: readString(body, "series"),
    publisher: readString(body, "publisher"),
    publishedYear: readNumber(body, "publishedYear"),
    languages: readStringArray(body, "languages"),
    numberOfPages: readNumber(body, "numberOfPages"),
  })
}
