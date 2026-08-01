import type { ResolvedMetadata } from "@prose-reader/archive-reader"
import {
  fetchMetadata,
  hasSearchTerms,
  type MetadataProvider,
} from "@prose-reader/metadata-fetcher"
import express, {
  type Express,
  type NextFunction,
  type Request,
  type Response,
} from "express"
import { parseMetadataInput } from "./parseMetadataInput.ts"
import { registerPlayground } from "./playground/playground.ts"

export type CreateAppOptions = {
  readonly providers: ReadonlyArray<MetadataProvider>
  readonly limit: number
  readonly minScore: number
  readonly requestTimeoutMs: number
  /**
   * Serve the development playground at `/`. Off in production, where the
   * service has no HTML surface at all — see `playground/`.
   */
  readonly playground: boolean
}

/** Request bodies are entities, not uploads — a resolved archive is small. */
const BODY_LIMIT = "1mb"

type Parsed<T> = { ok: true; value: T } | { ok: false; error: string }

/**
 * Per-request overrides of the deployment defaults, always from the query
 * string — so `POST /metadata` keeps a pure entity as its body.
 */
type RequestOptions = {
  limit: number
  minScore: number
  includeRaw: boolean
  providers: ReadonlyArray<MetadataProvider>
}

const queryValues = (value: unknown): string[] => {
  if (typeof value === "string") return [value]
  if (Array.isArray(value)) {
    return value.filter((entry): entry is string => typeof entry === "string")
  }

  return []
}

const queryValue = (value: unknown): string | undefined => queryValues(value)[0]

const parseNumber = (
  raw: string | undefined,
  key: string,
  fallback: number,
  { min, max, integer }: { min: number; max?: number; integer?: boolean },
): Parsed<number> => {
  if (raw === undefined) return { ok: true, value: fallback }

  const value = Number(raw)

  if (
    !Number.isFinite(value) ||
    (integer === true && !Number.isInteger(value))
  ) {
    return {
      ok: false,
      error: `${key} must be ${integer === true ? "an integer" : "a number"}`,
    }
  }
  if (value < min || (max !== undefined && value > max)) {
    return { ok: false, error: `${key} must be within ${min}–${max ?? "∞"}` }
  }

  return { ok: true, value }
}

const parseBoolean = (
  raw: string | undefined,
  key: string,
): Parsed<boolean> => {
  if (raw === undefined) return { ok: true, value: false }
  if (raw === "true" || raw === "1") return { ok: true, value: true }
  if (raw === "false" || raw === "0") return { ok: true, value: false }

  return { ok: false, error: `${key} must be true or false` }
}

const parseRequestOptions = (
  query: Request["query"],
  defaults: CreateAppOptions,
): Parsed<RequestOptions> => {
  const limit = parseNumber(queryValue(query.limit), "limit", defaults.limit, {
    min: 1,
    max: 50,
    integer: true,
  })

  if (!limit.ok) return limit

  const minScore = parseNumber(
    queryValue(query.minScore),
    "minScore",
    defaults.minScore,
    { min: 0, max: 1 },
  )

  if (!minScore.ok) return minScore

  const includeRaw = parseBoolean(queryValue(query.includeRaw), "includeRaw")

  if (!includeRaw.ok) return includeRaw

  // `?providers=openLibrary,…` narrows the lookup to a subset; unknown ids are
  // an error rather than a silent no-op, since "I asked mangadex and got
  // nothing" and "mangadex isn't deployed here" are very different answers
  const requested = queryValues(query.providers).flatMap((value) =>
    value
      .split(",")
      .map((id) => id.trim())
      .filter((id) => id.length > 0),
  )
  const unknown = requested.filter(
    (id) => !defaults.providers.some((provider) => provider.id === id),
  )

  if (unknown.length > 0) {
    return { ok: false, error: `Unknown provider(s): ${unknown.join(", ")}` }
  }

  return {
    ok: true,
    value: {
      limit: limit.value,
      minScore: minScore.value,
      includeRaw: includeRaw.value,
      providers:
        requested.length > 0
          ? defaults.providers.filter((provider) =>
              requested.includes(provider.id),
            )
          : defaults.providers,
    },
  }
}

/** `GET /metadata` search terms → the metadata to look up. */
const metadataFromQuery = (query: Request["query"]): ResolvedMetadata => {
  const authors = queryValues(query.author)
  const languages = queryValues(query.language)
  const series = queryValue(query.series)
  const year = Number(queryValue(query.year))

  return {
    ...(queryValue(query.title) !== undefined
      ? { title: queryValue(query.title) }
      : {}),
    ...(queryValue(query.isbn) !== undefined
      ? { isbn: queryValue(query.isbn) }
      : {}),
    ...(queryValue(query.gtin) !== undefined
      ? { gtin: queryValue(query.gtin) }
      : {}),
    ...(queryValue(query.publisher) !== undefined
      ? { publisher: queryValue(query.publisher) }
      : {}),
    ...(authors.length > 0
      ? { contributors: authors.map((name) => ({ name, roles: ["author"] })) }
      : {}),
    ...(languages.length > 0 ? { languages } : {}),
    ...(series !== undefined
      ? { belongsTo: { series: [{ name: series }] } }
      : {}),
    ...(Number.isFinite(year) ? { published: { year } } : {}),
  }
}

const isAbortError = (error: unknown): boolean =>
  error instanceof Error &&
  (error.name === "AbortError" || error.name === "TimeoutError")

/**
 * A thin HTTP surface over `fetchMetadata` — the package does the work, this
 * only parses requests and maps failures onto status codes:
 *
 * - `GET /health` — liveness plus the providers this deployment exposes
 * - `GET /metadata?title=…&author=…` — human-friendly lookup, for curl and
 *   quick tries
 * - `POST /metadata` — the integration path: post a `ResolvedArchive` (or a
 *   bare `ResolvedMetadata`) as the body, options on the query string
 *
 * Both metadata routes answer with the `FetchedMetadata` entity verbatim.
 */
export const createApp = (options: CreateAppOptions): Express => {
  const app = express()

  app.disable("x-powered-by")
  app.use(express.json({ limit: BODY_LIMIT }))

  // registered only in development, so `/` is a plain 404 for anyone hosting
  // this — there is no page to find, not a hidden one
  if (options.playground) registerPlayground(app)

  app.get("/health", (_request, response) => {
    response.json({
      status: "ok",
      providers: options.providers.map(({ id, name }) => ({ id, name })),
    })
  })

  const lookup = async (
    metadata: ResolvedMetadata,
    request: Request,
    response: Response,
    next: NextFunction,
  ): Promise<void> => {
    const parsed = parseRequestOptions(request.query, options)

    if (!parsed.ok) {
      response.status(400).json({ error: parsed.error })

      return
    }

    if (!hasSearchTerms(metadata)) {
      response.status(400).json({
        error:
          "No search term: provide at least a title, an author, an isbn, a gtin or an identifier",
      })

      return
    }

    const { providers, limit, minScore, includeRaw } = parsed.value

    try {
      const fetched = await fetchMetadata(metadata, {
        providers,
        limit,
        minScore,
        includeRaw,
        signal: AbortSignal.timeout(options.requestTimeoutMs),
      })

      // every catalog we could ask failed: the body still says who and what,
      // but the request did not get an answer — that is a gateway failure,
      // not a "found nothing"
      const allFailed =
        providers.length > 0 &&
        fetched.failedProviders.length === providers.length

      response.status(allFailed ? 502 : 200).json(fetched)
    } catch (error) {
      next(error)
    }
  }

  app.get("/metadata", (request, response, next) =>
    lookup(metadataFromQuery(request.query), request, response, next),
  )

  app.post("/metadata", (request, response, next) => {
    const metadata = parseMetadataInput(request.body)

    if (metadata === undefined) {
      response
        .status(400)
        .json({ error: "Body must be a JSON object of resolved metadata" })

      return
    }

    return lookup(metadata, request, response, next)
  })

  app.use((request, response) => {
    response
      .status(404)
      .json({ error: `Not found: ${request.method} ${request.path}` })
  })

  app.use(
    (
      error: unknown,
      _request: Request,
      response: Response,
      next: NextFunction,
    ) => {
      if (response.headersSent) {
        next(error)

        return
      }

      // the lookup budget ran out — the catalogs, not us, were slow
      if (isAbortError(error)) {
        response.status(504).json({ error: "Metadata lookup timed out" })

        return
      }

      // a malformed JSON body is express.json's own error
      if (
        error instanceof SyntaxError ||
        (error instanceof Error && error.name === "PayloadTooLargeError")
      ) {
        response.status(400).json({ error: error.message })

        return
      }

      console.error("metadata-fetcher-api: unhandled error", error)

      response.status(500).json({ error: "Internal server error" })
    },
  )

  return app
}
