# Metadata Fetcher

**`@prose-reader/metadata-fetcher`** fetches a book's metadata from online catalogs. [archive-reader](../archive-reader/README.md) reads what the file itself carries; this reads what the world knows about it.

It takes a compact `FetchMetadataInput`, asks a list of **pluggable providers**, scores every rich catalog candidate against that input, and returns the ranked alternatives plus the per-provider detail behind them:

```typescript
import { resolveArchive } from "@prose-reader/archive-reader"
import {
  createGoogleBooksProvider,
  createOpenLibraryProvider,
  createProjectGutenbergProvider,
  fetchMetadata,
  metadataInputFromResolvedArchive,
} from "@prose-reader/metadata-fetcher"

const resolved = await resolveArchive(archive)
const input = metadataInputFromResolvedArchive(resolved)
const fetched = await fetchMetadata(input, {
  providers: [
    createProjectGutenbergProvider(),
    createGoogleBooksProvider({ apiKey: "your-api-key" }),
    createOpenLibraryProvider(),
  ],
})

const match = fetched.matches.find(({ accepted }) => accepted)
match?.metadata.cover?.uri // what the best accepted candidate says
match?.score // …and how sure we are it is this book
```

{% hint style="info" %}
This package targets **Node** — metadata lookups belong to a library backend or an import pipeline, not to the reading surface. Its output is plain JSON, so what you persist there is what a reader consumes later.
{% endhint %}

Nothing here needs an archive: hand-built terms work just as well, which is what a "search by title" form or a filename-derived guess produces.

```typescript
const fetched = await fetchMetadata(
  { title: "Dune", authors: ["Frank Herbert"] },
  { providers: [createOpenLibraryProvider()] },
)
```

## Lookup input

The input is owned by the fetcher and contains exactly the fields its providers and matcher understand:

```typescript
type KnownMetadataIdentifierScheme =
  | "ISBN"
  | "GTIN"
  | "DOI"
  | "GoogleBooks"
  | "OpenLibrary"
  | "ProjectGutenberg"
  | "URL"
  | "Unknown"

type MetadataIdentifierScheme =
  | KnownMetadataIdentifierScheme
  | (string & {}) // custom catalog/application scheme

type MetadataIdentifier = {
  value: string
  scheme: MetadataIdentifierScheme
}

type FetchMetadataInput = {
  title?: string
  authors?: ReadonlyArray<string>
  identifiers?: ReadonlyArray<MetadataIdentifier>
  series?: string
  publisher?: string
  publishedYear?: number
  languages?: ReadonlyArray<string>
  numberOfPages?: number
}
```

Some fields start a request (`title`, `authors`, `series`, identifiers); others disambiguate the candidates that come back (`publisher`, `publishedYear`, languages, page count). ISBN, GTIN and catalog ids all use the same identifier shape: `{ value: "9780441013593", scheme: "ISBN" }` and `{ value: "zyTCAlFPjgYC", scheme: "GoogleBooks" }`. The known schemes give TypeScript autocomplete, while any consumer-defined string remains valid. `Unknown` explicitly preserves a source identifier whose namespace cannot be classified; `URL` means a validated absolute HTTP(S) identifier. Fields with no input role — covers, descriptions, subjects, rights, layout and format-specific metadata — are deliberately absent.

`metadataInputFromResolvedArchive` is the explicit bridge from archive-reader. It only requires the `metadata` projection, so callers do not need to resolve reading order, TOC or sources for a lookup:

```typescript
const resolved = await resolveArchive(archive, { include: ["metadata"] })
const input = metadataInputFromResolvedArchive(resolved)
```

The adapter selects authors from contributors, the first series, and the edition publisher/year with original-publication data as fallback. It forwards every identifier with its scheme and removes only archive-specific details such as `unique`.

## The fetched entity

`fetchMetadata` returns a plain-JSON entity — structured-clone-able, persistable, cacheable — the metadata-fetching equivalent of `ResolvedArchive`:

```typescript
type FetchedMetadata = {
  version: number
  /** every match across every provider, ranked best-first */
  matches: MetadataMatch[]
  /** per-provider detail, keyed by provider id */
  sources: Record<string, { provider: { id, name }; matches: MetadataMatch[] }>
  /** providers whose search threw */
  /** providers that dropped out, with the HTTP status when there was one */
  failedProviders: { id: string; status?: number }[]
}
```

`version` is currently `5`. Every candidate uses the explicit `publication.original` / `publication.edition` vocabulary.

`matches` are deliberately not consolidated into a single metadata record. A score says how strongly a candidate resembles the input; it does not prove that several accepted candidates describe the same edition. Keeping the candidates separate avoids silently mixing fields from competing records and leaves selection policy with the consumer.

`sources` groups those same matches by provider. Unlike archive sources, the key space is open: providers are pluggable, so the keys are whatever providers you passed.

## Matches: how it matched

A match is a candidate plus the evidence for it:

```typescript
type MetadataMatch = {
  providerId: string
  /** 0–1 aggregate confidence */
  score: number
  /** every field comparison behind the score */
  signals: {
    field: "isbn" | "gtin" | "identifiers" | "title" | "authors" |
           "series" | "publisher" | "publishedYear" | "languages" |
           "numberOfPages"
    score: number
    weight: number
    /** the two values compared, rendered for display */
    query: string
    candidate: string
  }[]
  /** reached minScore */
  accepted: boolean
  metadata: ResolvedMetadata
  id?: string
  url?: string
  raw?: unknown
}
```

Scoring is done by the package, identically for every provider — a provider never grades its own homework, so scores stay comparable across catalogs and a match stays explainable to a user ("same title and author, different edition publisher"):

```typescript
fetched.matches[0]?.signals
// [
//   { field: "title", score: 1, weight: 0.8, query: "Dune", candidate: "Dune" },
//   { field: "authors", score: 1, weight: 0.5, query: "Frank Herbert", … },
//   { field: "publisher", score: 0.2, weight: 0.15, query: "Ace", candidate: "Chilton Books" },
// ]
```

The rules:

- **Only comparable fields count.** A field is compared when *both* sides state it. What the book doesn't know can neither raise nor lower a candidate, so a sparse EPUB and a rich one land on the same 0–1 scale. A candidate with nothing in common to compare scores `0`.
- **The aggregate is a weighted average** of those fields, with weights expressing intent rather than statistics (exported as `METADATA_MATCH_WEIGHTS`):

  | Field | Weight | |
  | --- | --- | --- |
  | `isbn`, `gtin` | 1 | identifiers *are* the book |
  | `title` | 0.8 | what a human recognizes it by |
  | `identifiers` | 0.6 | other identifier systems, scheme-aware |
  | `authors` | 0.5 | compared as people |
  | `series` | 0.3 | |
  | `publishedYear` | 0.2 | year proximity against the candidate's publication data |
  | `publisher`, `languages`, `numberOfPages` | 0.15 | publication details — they must never sink a convincing match alone |

- **Confirmed identity settles it.** An agreeing ISBN or GTIN pins the score to `1` whatever else disagrees, and a provider-confirmed shared identifier does the same when both sides state the same non-`Unknown` scheme. An `Unknown` raw value is not decisive because it could collide with another catalog's identifier. A *contradicting* ISBN or GTIN scores `0`, which sinks a plausible-looking wrong edition. Disjoint provider-specific identifier lists are not treated as contradictions: catalogs naturally use different id spaces. ISBN-10 and ISBN-13 of the same book compare equal (`toIsbn13` is exported).
- **Comparisons are fuzzy where the world is.** Titles compare on character bigrams, against both the candidate's main title and that title composed with its `subtitle` entry — a book states `Dune: A Novel` in one `dc:title` where a catalog splits it in two, and only the comparison string is composed, never the returned metadata. The subtitle asymmetry is repaired on top (`Dune` ≡ `Dune: a novel`, but `Dune: Book One` ≠ `Dune: Messiah`). An explicit conflicting volume, part, or book number makes the title score `0` (`Vol. I` ≠ `vol. 2`) — in **any** compared form, so a bare `Irina` cannot launder the candidate's own `Vol. 1` against a query for `Vol. 2`, and a number the query states in its title is also compared against the candidate's series `position`, where a catalog keeps the same fact. Names compare on their token set (`Herbert, Frank` ≡ `Frank Herbert`); diacritics and punctuation are folded (`Les Misérables` ≡ `Les Miserables`); languages compare on their primary subtag (`en-US` ≡ `en`).
- **Flat publication evidence uses the best candidate value.** `publisher` and `publishedYear` compare against both the candidate's original and edition publication details when present; the closest value supplies the single signal.

`minScore` (default `0.5`) decides which matches are `accepted`. Rejected matches are **kept and ranked**, not dropped: "the catalog found three books, none convincing" is an answer, and it is exactly what a "did you mean?" picker renders.

```typescript
if (!fetched.matches.some(({ accepted }) => accepted)) {
  showPicker(fetched.matches) // nothing convincing — let the user choose
}
```

## Options

```typescript
const fetched = await fetchMetadata(input, {
  providers: [
    createProjectGutenbergProvider(),
    createGoogleBooksProvider({ apiKey: "your-api-key" }),
    createOpenLibraryProvider(),
  ],
  limit: 5,
  minScore: 0.5,
  includeRaw: false,
  signal: controller.signal,
})
```

| Option | Default | |
| --- | --- | --- |
| `providers` | — | the catalogs to ask, queried concurrently. Their order is the tie-break precedence: equally-scored matches rank in declaration order |
| `limit` | `5` | hard cap on the matches kept **per provider**, best-scoring first, and the page-size hint passed to each provider |
| `minScore` | `0.5` | score a match must reach to be `accepted` |
| `includeRaw` | `false` | keep each provider's own record on `match.raw`. Off by default: provenance most consumers don't need, and it can dwarf the normalized entity they persist |
| `signal` | — | cancellation, forwarded to every provider |

### Error policy

Mirrors `resolveArchive`: a provider that throws — a rate limit, an outage, a network error, a malformed response — never fails the fetch. Providers are asked concurrently and each is isolated, so one failing costs you that catalog and nothing else. It is logged through the debug `Report` and listed in `failedProviders`, the only trace left:

```typescript
// don't persist "we found nothing" when we simply couldn't ask
if (fetched.failedProviders.length === 0) cache.set(bookId, fetched)

// rate limited rather than broken: worth asking again, later
const throttled = fetched.failedProviders.filter(({ status }) => status === 429)
```

Each entry carries the catalog's HTTP `status` when the failure was a response — `429` (ask again later), `5xx` (the catalog is down), `4xx` (we asked wrong) — and no status when it wasn't one, which is itself the answer: a network error, an unparseable payload, a bug. Three states are distinguishable: a provider in `sources` answered, one in `failedProviders` threw, one in neither was never asked (narrowed out by the `providers` option).

`fetchMetadata` itself does not retry or interpret `Retry-After`; providers own that policy because only they know which operations are idempotent and which failures their catalog treats as transient. The built-in Google Books provider retries its transient failures as described below. A provider that exhausts its own retries is reported here normally.

Cancelling through `signal` is the one exception: it rejects, since the caller asked for it.

## Choosing metadata

The globally ranked `matches` list makes the simplest policy explicit: select its first accepted entry. A UI can instead present several alternatives, prefer a provider, or require a confirmed identifier before applying anything.

```typescript
const match = fetched.matches.find(({ accepted }) => accepted)

if (match !== undefined) {
  importMetadata(match.metadata)
}
```

Each candidate remains a `ResolvedMetadata`, so it can be handled with the same application code as metadata read from the publication. The fetcher does not decide how local and remote values should be reconciled.

{% hint style="info" %}
A remote `cover.uri` is an **absolute url**, not a container-relative uri: a catalog addresses its cover in its own space and there is nothing to rebase it onto. `cover.confidence` is `derived` — the catalog declares it.
{% endhint %}

## Providers

| Provider | Import | Catalog | Notes |
| --- | --- | --- | --- |
| `createProjectGutenbergProvider` | `@prose-reader/metadata-fetcher` | [Project Gutenberg](https://www.gutenberg.org) | official per-eBook RDF; exact Gutenberg identifiers only, no key |
| `createGoogleBooksProvider` | `@prose-reader/metadata-fetcher` | [Google Books](https://books.google.com) | broad edition metadata and covers; API key required |
| `createOpenLibraryProvider` | `@prose-reader/metadata-fetcher` | [Open Library](https://openlibrary.org) | free, no key; books broadly, comics and manga much less so |

### Project Gutenberg

```typescript
import { createProjectGutenbergProvider } from "@prose-reader/metadata-fetcher"

const provider = createProjectGutenbergProvider({
  userAgent: "MyReader/1.0 (contact@example.com)",
})
```

| Option | Default | |
| --- | --- | --- |
| `baseUrl` | `https://www.gutenberg.org` | catalog origin; override for a mirror or stub |
| `fetch` | the global one | for tests, a custom agent, or a caching layer |
| `userAgent` | — | optional identifying user agent |

**Lookup strategy**, exactly one request: the provider recognizes an official Gutenberg URL in `identifiers` (including `/ebooks/78139`, `/files/78139/…`, `/cache/epub/78139/…`, and the older `/78139` form), or a numeric identifier whose scheme is `ProjectGutenberg`. It then requests Gutenberg's official per-eBook RDF record at `/cache/epub/{id}/pg{id}.rdf`. A title or author alone never triggers the provider, so it neither crawls the website nor returns a fuzzy Gutenberg hit. Arbitrary URLs and identifiers with another authored scheme are ignored.

The confirmed candidate echoes the book's exact input identifier and adds `{ value: "78139", scheme: "ProjectGutenberg" }`. A shared scheme-scoped identifier makes the match decisive even when the catalog and embedded titles differ. A missing RDF record returns no candidate; a failing or malformed response is reported through `failedProviders` like any other provider failure.

**Mapping** (per-eBook RDF → `ResolvedMetadata`):

| Project Gutenberg RDF | Resolved | |
| --- | --- | --- |
| `pgterms:ebook@rdf:about` | `identifiers` | numeric scheme `ProjectGutenberg`; the exact matched input identifier is preserved too |
| `dcterms:title` | `title`, `titles` | |
| `dcterms:creator`, `marcrel:*` | `contributors` | common MARC relators normalize to roles such as `author`, `translator`, `editor`, and `illustrator`; unknown codes remain verbatim |
| `dcterms:issued` | `publication.edition.date` | Gutenberg ebook release date, parsed through day precision when available; it is not the work's original publication date |
| `dcterms:publisher` | `publication.edition.publisher` | the publisher of the Gutenberg edition |
| `pgterms:marc260` | `publication.original.date`, `publication.original.publisher` | original print statement; only one unambiguous `$c` year and `$b` publisher are promoted |
| `dcterms:rights` | `rights` | |
| `dcterms:language` | `languages` | RDF values are already BCP 47 |
| LCSH `dcterms:subject`, `pgterms:bookshelf` | `subjects` | deduped and capped at 25; Library of Congress classification codes are excluded |
| `pgterms:marc520`, then `dcterms:description` | `description` | catalog summary preferred over a general note |
| medium/small cover in `dcterms:hasFormat` | `cover` | medium preferred; absolute HTTP(S) url, `confidence: "derived"` |

The response is parsed and normalized in memory. The provider has no database, cache, file writes, or other persistence.

### Google Books

```typescript
import { createGoogleBooksProvider } from "@prose-reader/metadata-fetcher"

const provider = createGoogleBooksProvider({
  apiKey: "your-api-key",
})
```

| Option | Default | |
| --- | --- | --- |
| `apiKey` | — | required application API key |
| `baseUrl` | `https://www.googleapis.com/books/v1` | API root; override for a stub |
| `fetch` | the global one | for tests, a custom agent, or a caching layer |

**Lookup strategy**, from most exact to broadest: an authored `GoogleBooks` identifier (or official Google Books/API URL), an `ISBN` identifier, then title plus first author. When the author makes a title query too narrow, the provider tries title alone. Search requests ask only for books, preserve Google's relevance order, and request at most 40 results — the API's maximum. A query with none of these terms returns no candidates without making a request.

To replace Oboku's `googleVolumeId`, pass it directly:

```typescript
const input = {
  title: "Dune",
  identifiers: [{ value: googleVolumeId, scheme: "GoogleBooks" }],
}
```

An official Google Books website/API URL with scheme `URL` is recognized too. An exact lookup echoes the confirmed volume id as `{ value: id, scheme: "GoogleBooks" }`, so the shared matcher treats it as decisive and `metadataInputFromResolvedArchive` can forward it unchanged for a later refresh. A missing volume id falls through to ISBN/title when available. ISBN searches likewise retain the queried ISBN identifier even when a sparse Google record omits `industryIdentifiers`.

Each request makes at most three total attempts. Network failures and HTTP `500`, `502`, `503` and `504` responses are retried with abortable exponential backoff and jitter; client errors such as an invalid key are not. When the third attempt fails, or when a successful exact response is malformed, the provider is reported through `failedProviders` normally.

**Mapping** (Google Books Volume → `ResolvedMetadata`):

| Google Books | Resolved | |
| --- | --- | --- |
| `id` | `identifiers` | scheme `GoogleBooks`; also `id` on the match |
| `volumeInfo.title` | `titles` | verbatim; the main title (first entry) |
| `subtitle` | `titles` | its own entry, typed `subtitle` — never appended to the main title |
| `seriesInfo.volumeSeries` | `belongsTo.series` | `seriesId` as a `GoogleBooks` identifier, `orderNumber` as `position`. Google never states the series *name*, and `bookDisplayNumber` / `shortSeriesBookTitle` are display strings by its own definition, so neither is mapped |
| `authors` | `contributors` | role `author` |
| `publisher`, `publishedDate` | `publication.edition` | partial dates retain the available year/month/day |
| `description` | `description` | Google may provide simple HTML formatting |
| `industryIdentifiers` | `identifiers` | ISBN schemes normalize to `ISBN`; every announced identifier is retained |
| `pageCount` | `numberOfPages` | |
| `categories` | `subjects` | deduped and capped at 25 |
| `language` | `languages` | Google's best ISO 639-1 language |
| `imageLinks` | `cover` | largest announced size preferred; upgraded to HTTPS while Google's query parameters are preserved because changing them can yield a placeholder |
| `canonicalVolumeLink`, then `infoLink` | match `url` | upgraded to HTTPS; a stable Google Books URL is synthesized from `id` when absent |

Google-specific values without a cross-format home (ratings, access and sale data, and so on) remain available on `match.raw` when `includeRaw` is enabled.

### Open Library

```typescript
import { createOpenLibraryProvider } from "@prose-reader/metadata-fetcher"

const provider = createOpenLibraryProvider({
  userAgent: "MyReader/1.0 (contact@example.com)",
})
```

| Option | Default | |
| --- | --- | --- |
| `baseUrl` | `https://openlibrary.org` | API origin |
| `coversBaseUrl` | `https://covers.openlibrary.org` | cover service origin |
| `fetch` | the global one | for tests, a custom agent, or a caching layer |
| `userAgent` | — | Open Library's API etiquette asks for an identifying one (app name + contact) and throttles anonymous traffic harder |

**Lookup strategy**, at most four requests: an ISBN search when the book states one — the catalog then verifies the identity for us; an exact `id_project_gutenberg` search when an identifier is an official Project Gutenberg URL or a numeric `ProjectGutenberg` identifier; then a precise title (+ first author) search when those identifiers are unknown to Open Library or absent. When that precise search is empty, a free-text title-and-author query handles records whose work title and subtitle were indexed separately. The Gutenberg crosswalk is applied explicitly by this provider because `id_project_gutenberg` is Open Library's catalog field, not a generic URL convention in the scorer. A query with none of those terms yields no candidates rather than a fishing expedition.

**Mapping** (`search.json` doc → `ResolvedMetadata`):

| Open Library | Resolved | |
| --- | --- | --- |
| `title` | `titles` | verbatim; the main title (first entry) |
| `subtitle` | `titles` | its own entry, typed `subtitle` — the matcher composes the two when it compares, so nothing is gained by joining them here |
| `author_name` | `contributors` | role `author` |
| `first_publish_year` | `publication.original.date.year` | |
| `language` | `languages` | MARC 21 → BCP 47 (`eng` → `en`); unknown codes pass through, `und`/`mul`/`zxx` are dropped |
| `subject` | `subjects` | capped at the first 25 — a popular work carries hundreds, most of them long-tail noise |
| `number_of_pages_median` | `numberOfPages` | |
| `cover_i` | `cover` | absolute url on the cover service, `confidence: "derived"` |
| `id_project_gutenberg` | `identifiers` | scheme `ProjectGutenberg`; an exact lookup also echoes the book's original Gutenberg URL so the shared scorer can recognize the agreement |
| `key` | `identifiers` | scheme `OpenLibrary`, e.g. `/works/OL893415W`; also `id` and `url` on the match |

An `ISBN` identifier is added **only** when the search was an ISBN lookup, and then it uses the queried value: the API answered "this work has that ISBN", which is a fact about the record. A title-search hit describes a *work*, whose editions each have their own ISBN, so picking one would be fabrication.

Only the mapped fields are requested (`fields=`), which is the difference between a few hundred bytes per hit and a few hundred kilobytes.

## Running it as a service

A Docker image wraps this package in a small HTTP API, so metadata lookups don't have to happen inside your JavaScript app — and so you can try a provider against a real catalog with curl:

For repository development, copy `apps/metadata-fetcher-api/.env.example` to `apps/metadata-fetcher-api/.env`, set `GOOGLE_BOOKS_API_KEY`, then run `npm run start:metadata-fetcher` from the repository root. Compose loads that file automatically and it remains ignored by Git.

```bash
docker run -p 6382:6382 \
  -e GOOGLE_BOOKS_API_KEY="your-api-key" \
  -e OPEN_LIBRARY_USER_AGENT="MyApp/1.0 (me@example.com)" \
  mbret/prose-metadata-fetcher-api:latest

curl "http://localhost:6382/metadata?isbn=9780441013593"
```

The image is published with every release, tagged with the version and `latest`, for `linux/amd64` and `linux/arm64`.

| Route | |
| --- | --- |
| `GET /health` | liveness, plus the providers the deployment exposes |
| `GET /metadata?title=&author=&isbn=…` | human-friendly lookup |
| `POST /metadata` | body is a `FetchMetadataInput`, options on the query string |

Both metadata routes answer with the `FetchedMetadata` entity verbatim. The options above (`limit`, `minScore`, `includeRaw`, plus a `providers` filter) are query parameters, and the deployment defaults are environment variables.

For development, `npm run start:metadata-fetcher` starts the same image with the source bind-mounted: editing the express app restarts it, editing this package rebuilds it and the API picks it up. It also serves a playground at `/` — enter metadata manually or choose an EPUB/CBZ/ZIP file, then inspect each candidate, its score and the signals behind it. In both cases the playground posts the canonical `FetchMetadataInput` JSON to `/metadata`, so the browser's network inspector shows the exact input an SDK consumer would provide. Uploaded files have no application-level size limit: archive-reader resolves them in memory and discards them before that compact input is posted, with no disk or browser storage. The playground is development-only: the production image sets `NODE_ENV=production`, and the route is then never registered.

See [the app's README](https://github.com/mbret/prose-reader/tree/master/apps/metadata-fetcher-api) for the full reference.

## Writing a provider

A provider is three things: a stable `id`, a display `name`, and a `search` returning normalized candidates. It never scores its own results — that stays in the package, identically for everyone.

```typescript
import { type MetadataProvider } from "@prose-reader/metadata-fetcher"

const myProvider: MetadataProvider = {
  id: "myCatalog",
  name: "My Catalog",
  search: async (input, { limit, signal }) => {
    if (input.title === undefined) return []

    const response = await fetch(
      `https://example.com/search?q=${encodeURIComponent(input.title)}` +
        `&author=${encodeURIComponent(input.authors?.[0] ?? "")}`,
      { signal },
    )
    const { results } = await response.json()

    return results.slice(0, limit).map((result) => ({
      id: result.id,
      url: `https://example.com/book/${result.id}`,
      raw: result,
      metadata: {
        title: result.name,
        identifiers: [{ value: result.isbn, scheme: "ISBN" }],
        contributors: result.authors.map((name) => ({
          name,
          roles: ["author"],
        })),
      },
    }))
  },
}
```

The asymmetry is intentional: providers receive the small `FetchMetadataInput` and return rich `ResolvedMetadata` candidates. The input exposes only lookup and matching evidence; results retain covers, descriptions, subjects, contributors and every other useful catalog value.

Helpers cover archive conversion and common input checks:

```typescript
import {
  hasSearchTerms,
  metadataInputFromResolvedArchive,
} from "@prose-reader/metadata-fetcher"

const input = metadataInputFromResolvedArchive(resolved)

// is there anything to go on at all? publication details or a page count
// narrow a search but cannot start one, so they don't count
if (!hasSearchTerms(input)) return
```

Rules of thumb:

- **Return an empty list, don't throw**, when the input carries nothing you can search on. Throwing is for actual failures — they land in `failedProviders`.
- **Throw `MetadataProviderResponseError`** when the catalog answers with a failing status, so the status reaches the caller instead of dying in a log line. Any error carrying a numeric `status` works too, which covers HTTP clients that throw their own:

  ```typescript
  import { MetadataProviderResponseError } from "@prose-reader/metadata-fetcher"

  if (!response.ok) {
    throw new MetadataProviderResponseError(response.status, "My Catalog search failed")
  }
  ```
- **Use `retryWithBackoff`** when an idempotent provider request has known transient failures. `attempts` counts the initial call, and cancellation interrupts the next delay. Pass the same signal to the request when it should cancel an active call too. The helper deliberately leaves the retry predicate to the provider:

  ```typescript
  import {
    responseErrorStatus,
    retryWithBackoff,
  } from "@prose-reader/metadata-fetcher"

  const response = await retryWithBackoff(() => requestCatalog({ signal }), {
    attempts: 3,
    initialDelayMs: 1_000,
    signal,
    shouldRetry: (error) => responseErrorStatus(error) === 503,
  })
  ```
- **Forward `signal`** to every request you make.
- **Treat `limit` as a page-size hint**; the fetch caps the ranked result anyway.
- **Normalize honestly.** Populate a field only when the record actually states it — a fabricated value is a signal the matcher will score, and a wrong `ISBN` identifier is the single most damaging thing you can emit.
- **`raw` is yours**: put your parsed record there for provenance and provider-specific fields with no home in the vocabulary. It is kept only when the consumer asks for it.

The matching primitives are exported too (`scoreMetadataCandidate`, `titleSimilarity`, `personNameSimilarity`, `textSimilarity`, `normalizeForComparison`) if you want to rank something of your own by the same rules — `scoreMetadataCandidate(input, candidate)` takes a `FetchMetadataInput` and a rich `ResolvedMetadata` candidate.
