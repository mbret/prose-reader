/**
 * Thrown by a provider when a catalog answered with a failing status. Carrying
 * it is what lets `fetchMetadata` report *why* a provider dropped out: `429`
 * is "ask again later", `503` is "the catalog is down", and a consumer decides
 * differently for each.
 *
 * ```ts
 * if (!response.ok) {
 *   throw new MetadataProviderResponseError(response.status, "My Catalog search failed")
 * }
 * ```
 */
export class MetadataProviderResponseError extends Error {
  readonly status: number
  /**
   * How long the catalog asked to wait before trying again, from its
   * `Retry-After` header (see {@link parseRetryAfterHeader}).
   */
  readonly retryAfterMs?: number

  constructor(
    status: number,
    message?: string,
    options: { readonly retryAfterMs?: number } = {},
  ) {
    super(message ?? `Provider responded with status ${status}`)

    this.name = "MetadataProviderResponseError"
    this.status = status

    if (options.retryAfterMs !== undefined) {
      this.retryAfterMs = options.retryAfterMs
    }
  }
}

/**
 * A `Retry-After` header as a delay in milliseconds from `now`. The header is
 * either a number of seconds or an HTTP date; a date already past is `0`, and
 * anything else, absence included, is `undefined`.
 *
 * ```ts
 * throw new MetadataProviderResponseError(response.status, "My Catalog search failed", {
 *   retryAfterMs: parseRetryAfterHeader(response.headers.get("Retry-After")),
 * })
 * ```
 */
export const parseRetryAfterHeader = (
  value: string | null | undefined,
  now: number = Date.now(),
): number | undefined => {
  const trimmed = value?.trim()

  if (trimmed === undefined || trimmed.length === 0) return undefined

  if (/^\d+$/.test(trimmed)) return Number(trimmed) * 1_000

  // an HTTP date always names its month: without the check `Date.parse`
  // reads a negative delay such as `-5` as the year -5
  if (!/[a-z]/i.test(trimmed)) return undefined

  const date = Date.parse(trimmed)

  return Number.isNaN(date) ? undefined : Math.max(0, date - now)
}

/**
 * The HTTP status behind a thrown error, when there is one.
 *
 * Structural rather than `instanceof`, so a provider built on another HTTP
 * client works unadapted. No status means it was never a response — network,
 * parse, bug — which is itself the answer.
 */
export const responseErrorStatus = (error: unknown): number | undefined => {
  if (typeof error !== "object" || error === null) return undefined
  if (!("status" in error)) return undefined

  const { status } = error

  if (typeof status !== "number" || !Number.isInteger(status)) return undefined

  // an unrelated `status` field means something else entirely
  return status >= 100 && status <= 599 ? status : undefined
}

/**
 * The delay a thrown error says the catalog asked for, when it says one.
 * Structural, like {@link responseErrorStatus}: any error carrying a
 * non-negative numeric `retryAfterMs` answers.
 */
export const responseErrorRetryAfterMs = (
  error: unknown,
): number | undefined => {
  if (typeof error !== "object" || error === null) return undefined
  if (!("retryAfterMs" in error)) return undefined

  const { retryAfterMs } = error

  return typeof retryAfterMs === "number" &&
    Number.isFinite(retryAfterMs) &&
    retryAfterMs >= 0
    ? retryAfterMs
    : undefined
}
