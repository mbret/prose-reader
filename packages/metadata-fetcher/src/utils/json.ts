/**
 * Readers for `JSON.parse` output. A catalog's payload is third-party data, so
 * it enters as `unknown` and every field goes through a guard: a renamed or
 * nulled field reads as absent instead of crashing the fetch, or producing a
 * candidate with `undefined` where a string was promised.
 */
export const isJsonRecord = (
  value: unknown,
): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value)

export const readString = (
  record: Record<string, unknown>,
  key: string,
): string | undefined => {
  const value = record[key]

  if (typeof value !== "string") return undefined

  const trimmed = value.trim()

  return trimmed.length > 0 ? trimmed : undefined
}

export const readNumber = (
  record: Record<string, unknown>,
  key: string,
): number | undefined => {
  const value = record[key]

  return typeof value === "number" && Number.isFinite(value) ? value : undefined
}

/** Non-string and blank entries are dropped; empty reads as absent. */
export const readStringArray = (
  record: Record<string, unknown>,
  key: string,
): ReadonlyArray<string> | undefined => {
  const value = record[key]

  if (!Array.isArray(value)) return undefined

  const strings = value
    .filter((entry): entry is string => typeof entry === "string")
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0)

  return strings.length > 0 ? strings : undefined
}

export const readRecordArray = (
  record: Record<string, unknown>,
  key: string,
): ReadonlyArray<Record<string, unknown>> => {
  const value = record[key]

  if (!Array.isArray(value)) return []

  return value.filter(isJsonRecord)
}
