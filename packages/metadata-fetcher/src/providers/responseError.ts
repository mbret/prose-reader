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

  constructor(status: number, message?: string) {
    super(message ?? `Provider responded with status ${status}`)

    this.name = "MetadataProviderResponseError"
    this.status = status
  }
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
