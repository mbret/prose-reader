export type RetryWithBackoffOptions = {
  /** Total calls, including the initial one. Must be a positive integer. */
  readonly attempts: number
  /** Delay before the second call. Later delays double. */
  readonly initialDelayMs: number
  /** Upper bound for one delay, including jitter. */
  readonly maxDelayMs?: number
  /** Adds up to one base delay of randomness. Defaults to `true`. */
  readonly jitter?: boolean
  /** Decides whether a failed call is safe and useful to repeat. */
  readonly shouldRetry: (error: unknown, attempt: number) => boolean
  /** Stops future attempts and cancels a wait between attempts. */
  readonly signal?: AbortSignal
}

const abortReason = (signal: AbortSignal): unknown =>
  signal.reason ?? new DOMException("The operation was aborted", "AbortError")

const throwIfAborted = (signal: AbortSignal | undefined): void => {
  if (signal?.aborted === true) throw abortReason(signal)
}

const wait = (
  delayMs: number,
  signal: AbortSignal | undefined,
): Promise<void> => {
  throwIfAborted(signal)

  return new Promise((resolve, reject) => {
    const onAbort = () => {
      clearTimeout(timeout)
      reject(signal !== undefined ? abortReason(signal) : undefined)
    }
    const timeout = setTimeout(() => {
      signal?.removeEventListener("abort", onAbort)
      resolve()
    }, delayMs)

    signal?.addEventListener("abort", onAbort, { once: true })
  })
}

const validateOptions = (options: RetryWithBackoffOptions): void => {
  if (!Number.isInteger(options.attempts) || options.attempts < 1) {
    throw new RangeError("attempts must be a positive integer")
  }

  if (!Number.isFinite(options.initialDelayMs) || options.initialDelayMs < 0) {
    throw new RangeError("initialDelayMs must be a non-negative finite number")
  }

  if (
    options.maxDelayMs !== undefined &&
    (!Number.isFinite(options.maxDelayMs) || options.maxDelayMs < 0)
  ) {
    throw new RangeError("maxDelayMs must be a non-negative finite number")
  }
}

const retryDelay = (
  failedAttempt: number,
  options: RetryWithBackoffOptions,
): number => {
  const exponentialDelay = options.initialDelayMs * 2 ** (failedAttempt - 1)
  const jitteredDelay =
    options.jitter === false
      ? exponentialDelay
      : exponentialDelay * (1 + Math.random())

  return Math.min(jitteredDelay, options.maxDelayMs ?? Number.MAX_SAFE_INTEGER)
}

/**
 * Repeats a failing asynchronous operation with abortable exponential backoff.
 * `attempts` is the total call count, not the number of retries. The original
 * error is rethrown when it is not retryable or the final attempt fails.
 */
export const retryWithBackoff = async <Value>(
  operation: (attempt: number) => Promise<Value>,
  options: RetryWithBackoffOptions,
): Promise<Value> => {
  validateOptions(options)

  for (let attempt = 1; attempt <= options.attempts; attempt += 1) {
    throwIfAborted(options.signal)

    try {
      return await operation(attempt)
    } catch (error) {
      if (
        attempt === options.attempts ||
        options.signal?.aborted === true ||
        !options.shouldRetry(error, attempt)
      ) {
        throw error
      }

      await wait(retryDelay(attempt, options), options.signal)
    }
  }

  throw new Error("retryWithBackoff reached an invalid state")
}
