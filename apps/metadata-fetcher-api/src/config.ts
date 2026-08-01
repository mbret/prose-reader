import {
  createOpenLibraryProvider,
  type MetadataProvider,
} from "@prose-reader/metadata-fetcher"

/**
 * Everything the API needs to serve, already validated. `createApp` takes it
 * as an argument and never reads `process.env` itself, which is what makes it
 * testable with stub providers and a one-millisecond timeout.
 */
export type ApiConfig = {
  readonly port: number
  readonly providers: ReadonlyArray<MetadataProvider>
  /** Default `limit` when the request doesn't override it. */
  readonly limit: number
  /** Default `minScore` when the request doesn't override it. */
  readonly minScore: number
  /**
   * Budget for one lookup, across every provider: a catalog that hangs must
   * not hold a connection forever. Exceeded, the fetch aborts and the request
   * answers `504`.
   */
  readonly requestTimeoutMs: number
  /**
   * Serve the development playground at `/`. Tied to `NODE_ENV` rather than a
   * switch of its own: the production image already sets it, so a hosted
   * deployment cannot forget to turn the page off, nor turn it back on.
   */
  readonly playground: boolean
}

/**
 * A malformed variable fails the boot: a typo in `PORT` that quietly serves on
 * 3000 is much harder to notice than a container refusing to start.
 */
const invalid = (key: string, value: string, expected: string): Error =>
  new Error(`Invalid ${key}: "${value}" is not ${expected}`)

const readNumber = (
  env: NodeJS.ProcessEnv,
  key: string,
  fallback: number,
  { min, max, integer }: { min: number; max?: number; integer?: boolean },
): number => {
  const raw = env[key]?.trim()

  if (raw === undefined || raw.length === 0) return fallback

  const value = Number(raw)

  if (!Number.isFinite(value)) throw invalid(key, raw, "a number")
  if (integer === true && !Number.isInteger(value)) {
    throw invalid(key, raw, "an integer")
  }
  if (value < min || (max !== undefined && value > max)) {
    throw invalid(key, raw, `within ${min}–${max ?? "∞"}`)
  }

  return value
}

const readString = (
  env: NodeJS.ProcessEnv,
  key: string,
): string | undefined => {
  const raw = env[key]?.trim()

  return raw !== undefined && raw.length > 0 ? raw : undefined
}

/**
 * Adding a catalog is a line here plus its env vars — the API surface does not
 * change, since `sources` is keyed by provider id.
 */
const providersFromEnv = (
  env: NodeJS.ProcessEnv,
): ReadonlyArray<MetadataProvider> => [
  createOpenLibraryProvider({
    userAgent: readString(env, "OPEN_LIBRARY_USER_AGENT"),
    baseUrl: readString(env, "OPEN_LIBRARY_BASE_URL"),
    coversBaseUrl: readString(env, "OPEN_LIBRARY_COVERS_BASE_URL"),
  }),
]

export const configFromEnv = (env: NodeJS.ProcessEnv): ApiConfig => ({
  port: readNumber(env, "PORT", 3000, { min: 0, max: 65535, integer: true }),
  providers: providersFromEnv(env),
  limit: readNumber(env, "METADATA_LIMIT", 5, { min: 1, integer: true }),
  minScore: readNumber(env, "METADATA_MIN_SCORE", 0.5, { min: 0, max: 1 }),
  requestTimeoutMs: readNumber(env, "REQUEST_TIMEOUT_MS", 10_000, {
    min: 1,
    integer: true,
  }),
  playground: env.NODE_ENV !== "production",
})
