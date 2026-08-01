/**
 * Minimal readers for `JSON.parse` output. A remote catalog's payload is
 * third-party data we cannot control, so it enters the package as `unknown`
 * and every field is read through a guard rather than asserted into shape —
 * a renamed or nulled field then reads as "absent" instead of crashing the
 * fetch or, worse, producing a candidate with `undefined` where a string was
 * promised.
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

/** Non-string and blank entries are dropped; an empty result reads as absent. */
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
