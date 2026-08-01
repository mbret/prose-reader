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
  readonly playground: boolean
}

const BODY_LIMIT = "1mb"

type Parsed<T> = { ok: true; value: T } | { ok: false; error: string }

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

  // unknown ids are an error rather than a silent no-op: "mangadex found
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
 * An HTTP surface over `fetchMetadata`: the package does the work, this parses
 * requests and maps failures onto status codes.
 *
 * - `GET /health` — liveness, plus the providers this deployment exposes
 * - `GET /metadata?title=…&author=…` — human-friendly, for curl
 * - `POST /metadata` — a `ResolvedArchive` (or bare `ResolvedMetadata`) body,
 *   options on the query string
 *
 * Both metadata routes answer with the `FetchedMetadata` entity verbatim.
 */
export const createApp = (options: CreateAppOptions): Express => {
  const app = express()

  app.disable("x-powered-by")
  app.use(express.json({ limit: BODY_LIMIT }))

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

      // nothing could be asked, which is a gateway failure rather than a
      // "found nothing" — the body still says who failed, and with what
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

      if (isAbortError(error)) {
        response.status(504).json({ error: "Metadata lookup timed out" })

        return
      }

      // express.json's own errors
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
