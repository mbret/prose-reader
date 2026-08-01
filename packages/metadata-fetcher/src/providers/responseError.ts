/**
 * The error a provider throws when a catalog answered, but with a failing
 * status — a rate limit, an outage, a bad request. Carrying the status is what
 * lets `fetchMetadata` report *why* a provider dropped out rather than just
 * that it did: a `429` is "ask again later", a `503` is "the catalog is down",
 * and a consumer decides differently for each.
 *
 * ```ts
 * if (!response.ok) {
 *   throw new MetadataProviderResponseError(response.status, "My Catalog search failed")
 * }
 * ```
 */
export class MetadataProviderResponseError extends Error {
  readonly status: number

  constructor(status: number, message?: string) {
    super(message ?? `Provider responded with status ${status}`)

    this.name = "MetadataProviderResponseError"
    this.status = status
  }
}

/**
 * The HTTP status behind a thrown error, when there is one.
 *
 * Structural rather than an `instanceof` check on
 * {@link MetadataProviderResponseError}: a provider built on another HTTP
 * client throws that client's error, and the ones worth understanding all
 * carry a numeric `status`. Anything else — a network error, a parse failure,
 * a bug — has no status, which is itself the answer.
 */
export const responseErrorStatus = (error: unknown): number | undefined => {
  if (typeof error !== "object" || error === null) return undefined
  if (!("status" in error)) return undefined

  const { status } = error

  if (typeof status !== "number" || !Number.isInteger(status)) return undefined

  // HTTP status range: guards against an unrelated `status` field meaning
  // something else entirely
  return status >= 100 && status <= 599 ? status : undefined
}
