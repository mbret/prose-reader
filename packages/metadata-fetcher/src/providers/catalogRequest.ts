import { retryWithBackoff } from "../utils/retryWithBackoff.ts"
import {
  MetadataProviderResponseError,
  parseRetryAfterHeader,
  responseErrorRetryAfterMs,
  responseErrorStatus,
} from "./responseError.ts"

const CATALOG_REQUEST_ATTEMPTS = 3
const CATALOG_INITIAL_RETRY_DELAY_MS = 1_000
/** Bounds the backoff and the `Retry-After` a catalog may ask us to honour. */
const CATALOG_MAX_RETRY_DELAY_MS = 3_000
/**
 * A rate limit is as transient as an outage: the same request succeeds once
 * the catalog's window has passed, which `Retry-After` says when it is known.
 */
const CATALOG_TRANSIENT_STATUSES = new Set([429, 500, 502, 503, 504])

/**
 * Releases a response nobody will read. Node's fetch keeps an unread body's
 * connection busy until garbage collection, so the failed attempts of a retry,
 * and the lookups running beside it, would pile up sockets.
 */
export const discardResponse = async (response: Response): Promise<void> => {
  // best effort: the status is the answer, and a body that fails to cancel
  // must not replace it
  await response.body?.cancel().catch(() => undefined)
}

/**
 * The failing response as an error, carrying its status and `Retry-After`.
 * Its body is released first, since nothing reads it.
 */
export const catalogResponseError = async (
  response: Response,
  message: string,
): Promise<MetadataProviderResponseError> => {
  await discardResponse(response)

  return new MetadataProviderResponseError(response.status, message, {
    retryAfterMs: parseRetryAfterHeader(response.headers.get("Retry-After")),
  })
}

/**
 * The built-in providers' one retry policy for an idempotent catalog request:
 * at most three attempts, retrying a network failure, a rate limit and an
 * outage with abortable backoff, or after the `Retry-After` the catalog asked
 * for when it fits the bound. Anything else, a client error included, is
 * thrown at once.
 */
export const retryCatalogRequest = <Value>(
  request: () => Promise<Value>,
  signal: AbortSignal | undefined,
): Promise<Value> =>
  retryWithBackoff(request, {
    attempts: CATALOG_REQUEST_ATTEMPTS,
    initialDelayMs: CATALOG_INITIAL_RETRY_DELAY_MS,
    maxDelayMs: CATALOG_MAX_RETRY_DELAY_MS,
    signal,
    shouldRetry: (error) => {
      const status = responseErrorStatus(error)

      return status === undefined || CATALOG_TRANSIENT_STATUSES.has(status)
    },
    requestedDelayMs: responseErrorRetryAfterMs,
  })
