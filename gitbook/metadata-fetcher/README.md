# Metadata Fetcher

**`@prose-reader/metadata-fetcher`** fetches a book's metadata from online catalogs. [archive-reader](../archive-reader/README.md) reads what the file itself carries; this reads what the world knows about it.

It takes a `ResolvedMetadata` — or anything carrying one, which is exactly the `ResolvedArchive` shape — asks a list of **pluggable providers**, scores every candidate against what you gave it, and gives back the same `ResolvedMetadata` vocabulary, plus the per-provider detail behind it:

```typescript
import { resolveArchive } from "@prose-reader/archive-reader"
import {
  createOpenLibraryProvider,
  createProjectGutenbergProvider,
  fetchMetadata,
} from "@prose-reader/metadata-fetcher"

const resolved = await resolveArchive(archive)
const fetched = await fetchMetadata(resolved, {
  providers: [
    createProjectGutenbergProvider(),
    createOpenLibraryProvider(),
  ],
})

fetched.metadata.cover?.uri // what the catalogs found
fetched.matches[0]?.score // …and how sure we are it is this book
```

{% hint style="info" %}
This package targets **Node** — metadata lookups belong to a library backend or an import pipeline, not to the reading surface. Its output is plain JSON, so what you persist there is what a reader consumes later.
{% endhint %}

Nothing here needs an archive: hand-built terms work just as well, which is what a "search by title" form or a filename-derived guess produces.

```typescript
const fetched = await fetchMetadata(
  { title: "Dune", contributors: [{ name: "Frank Herbert", roles: ["author"] }] },
  { providers: [createOpenLibraryProvider()] },
)
```

## The fetched entity

`fetchMetadata` returns a plain-JSON entity — structured-clone-able, persistable, cacheable — the metadata-fetching equivalent of `ResolvedArchive`:

```typescript
type FetchedMetadata = {
  version: number
  /** the accepted matches, merged — the same vocabulary resolveArchive produces */
  metadata: ResolvedMetadata
  /** every match across every provider, ranked best-first */
  matches: MetadataMatch[]
  /** per-provider detail, keyed by provider id */
  sources: Record<string, { provider: { id, name }; matches: MetadataMatch[] }>
  /** providers whose search threw */
  /** providers that dropped out, with the HTTP status when there was one */
  failedProviders: { id: string; status?: number }[]
}
```

`metadata` is **only** the remote answer — the local metadata is deliberately not folded in, so you stay free to decide who wins (see [Merging with what the book said](#merging-with-what-the-book-said)).

`sources` is the twin of `resolveArchive`'s `sources`: everything a provider contributed is also represented, merged, in `metadata`. The duplication is the contract — a wrong precedence opinion stays revisable because the per-provider values never left the entity. Unlike archive sources, the key space is open: providers are pluggable, so the keys are whatever providers you passed.

## Matches: how it matched

A match is a candidate plus the evidence for it:

```typescript
type MetadataMatch = {
  providerId: string
  /** 0–1 aggregate confidence */
  score: number
  /** every field comparison behind the score */
  signals: {
    field: "isbn" | "gtin" | "identifiers" | "title" | "contributors" |
           "series" | "publisher" | "published" | "languages" | "numberOfPages"
    score: number
    weight: number
    /** the two values compared, rendered for display */
    query: string
    candidate: string
  }[]
  /** reached minScore, so it contributed to the merged metadata */
  accepted: boolean
  metadata: ResolvedMetadata
  id?: string
  url?: string
  raw?: unknown
}
```

Scoring is done by the package, identically for every provider — a provider never grades its own homework, so scores stay comparable across catalogs and a match stays explainable to a user ("same title and author, different publisher"):

```typescript
fetched.matches[0]?.signals
// [
//   { field: "title", score: 1, weight: 0.8, query: "Dune", candidate: "Dune" },
//   { field: "contributors", score: 1, weight: 0.5, query: "Frank Herbert", … },
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
  | `contributors` | 0.5 | authors, compared as people |
  | `series` | 0.3 | |
  | `published` | 0.2 | year proximity: reprints shift it |
  | `publisher`, `languages`, `numberOfPages` | 0.15 | edition details — they must never sink a convincing match alone |

- **Confirmed identity settles it.** An agreeing ISBN or GTIN pins the score to `1` whatever else disagrees, and a provider-confirmed shared identifier does the same when both sides state the same scheme. A scheme-less raw value is not decisive because it could collide with another catalog's identifier. A *contradicting* ISBN or GTIN scores `0`, which sinks a plausible-looking wrong edition. Disjoint provider-specific identifier lists are not treated as contradictions: catalogs naturally use different id spaces. ISBN-10 and ISBN-13 of the same book compare equal (`toIsbn13` is exported).
- **Comparisons are fuzzy where the world is.** Titles compare on character bigrams with the subtitle asymmetry repaired (`Dune` ≡ `Dune: a novel`, but `Dune: Book One` ≠ `Dune: Messiah`); an explicit conflicting volume, part, or book number makes the title score `0` (`Vol. I` ≠ `vol. 2`). Names compare on their token set (`Herbert, Frank` ≡ `Frank Herbert`); diacritics and punctuation are folded (`Les Misérables` ≡ `Les Miserables`); languages compare on their primary subtag (`en-US` ≡ `en`).

`minScore` (default `0.5`) decides which matches are `accepted` — which ones contribute to the merged `metadata`. Rejected matches are **kept and ranked**, not dropped: "the catalog found three books, none convincing" is an answer, and it is exactly what a "did you mean?" picker renders.

```typescript
if (fetched.metadata.title === undefined) {
  showPicker(fetched.matches) // nothing convincing — let the user choose
}
```

## Options

```typescript
const fetched = await fetchMetadata(resolved, {
  providers: [
    createProjectGutenbergProvider(),
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
| `providers` | — | the catalogs to ask, queried concurrently. Their order is the tie-break precedence: equally-scored matches rank in declaration order, and that ranking drives the merged `metadata` |
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

There is deliberately **no retry, no backoff and no `Retry-After` handling** — a failure is reported, not papered over. A caller that wants to come back has what it needs to decide.

Cancelling through `signal` is the one exception: it rejects, since the caller asked for it.

## Merging with what the book said

`mergeResolvedMetadata` combines any number of `ResolvedMetadata`, **first defined wins**, field-wise. Precedence is entirely yours — pass the sources in the order you trust them:

```typescript
import { mergeResolvedMetadata } from "@prose-reader/metadata-fetcher"

// the book over the catalogs, catalogs filling its gaps
const metadata = mergeResolvedMetadata(resolved.metadata, fetched.metadata)

// the catalogs over the book (a scene-released CBZ with a junk ComicInfo)
const metadata = mergeResolvedMetadata(fetched.metadata, resolved.metadata)
```

Field-wise rather than object-wise, so a source knowing only a cover contributes its cover without hiding another's title. Two exceptions, both because the values are additive rather than competing: `identifiers` concatenate in argument order (deduped on scheme + value, like `resolveMetadata` does), and `belongsTo` merges its `series` and `collection` independently. Everything else — including `subjects` and `contributors` — takes the first stated value whole; unioning keyword lists across catalogs is a judgement call that belongs to you, not to a merge that must stay predictable.

{% hint style="info" %}
A remote `cover.uri` is an **absolute url**, not a container-relative uri: a catalog addresses its cover in its own space and there is nothing to rebase it onto. `cover.confidence` is `derived` — the catalog declares it.
{% endhint %}

## Providers

| Provider | Import | Catalog | Notes |
| --- | --- | --- | --- |
| `createProjectGutenbergProvider` | `@prose-reader/metadata-fetcher` | [Project Gutenberg](https://www.gutenberg.org) | official per-eBook RDF; exact Gutenberg identifiers only, no key |
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

**Mapping** (per-eBook RDF → `ResolvedMetadata`, exported as `projectGutenbergMetadataHomes`):

| Project Gutenberg RDF | Resolved | |
| --- | --- | --- |
| `pgterms:ebook@rdf:about` | `identifiers` | numeric scheme `ProjectGutenberg`; the exact matched input identifier is preserved too |
| `dcterms:title` | `title` | |
| `dcterms:creator`, `marcrel:*` | `contributors` | common MARC relators normalize to roles such as `author`, `translator`, `editor`, and `illustrator`; unknown codes remain verbatim |
| `dcterms:issued` | `published` | Gutenberg release date, parsed through day precision when available |
| `dcterms:publisher` | `publisher` | |
| `dcterms:rights` | `rights` | |
| `dcterms:language` | `languages` | RDF values are already BCP 47 |
| LCSH `dcterms:subject`, `pgterms:bookshelf` | `subjects` | deduped and capped at 25; Library of Congress classification codes are excluded |
| `pgterms:marc520`, then `dcterms:description` | `description` | catalog summary preferred over a general note |
| medium/small cover in `dcterms:hasFormat` | `cover` | medium preferred; absolute HTTP(S) url, `confidence: "derived"` |

The response is parsed and normalized in memory. The provider has no database, cache, file writes, or other persistence.

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

**Lookup strategy**, at most three requests: an ISBN search when the book states one — the catalog then verifies the identity for us; an exact `id_project_gutenberg` search when an identifier is an official Project Gutenberg URL or a numeric `ProjectGutenberg` identifier; then a title (+ first author) search when those identifiers are unknown to Open Library or absent. The Gutenberg crosswalk is applied explicitly by this provider because `id_project_gutenberg` is Open Library's catalog field, not a generic URL convention in the scorer. A query with none of those terms yields no candidates rather than a fishing expedition.

**Mapping** (`search.json` doc → `ResolvedMetadata`, exported as `openLibraryMetadataHomes`):

| Open Library | Resolved | |
| --- | --- | --- |
| `title` + `subtitle` | `title` | joined (`Dune: a novel`) — `ResolvedMetadata` has one title field, and an OPF `dc:title` normally carries the subtitle too |
| `author_name` | `contributors` | role `author` |
| `first_publish_year` | `published.year` | |
| `publisher` | `publisher` | first entry |
| `language` | `languages` | MARC 21 → BCP 47 (`eng` → `en`); unknown codes pass through, `und`/`mul`/`zxx` are dropped |
| `subject` | `subjects` | capped at the first 25 — a popular work carries hundreds, most of them long-tail noise |
| `number_of_pages_median` | `numberOfPages` | |
| `cover_i` | `cover` | absolute url on the cover service, `confidence: "derived"` |
| `id_project_gutenberg` | `identifiers` | scheme `ProjectGutenberg`; an exact lookup also echoes the book's original Gutenberg URL so the shared scorer can recognize the agreement |
| `key` | `identifiers` | scheme `OpenLibrary`, e.g. `/works/OL893415W`; also `id` and `url` on the match |

`isbn` is set **only** when the search was an ISBN lookup, and then it is the queried one: the API answered "this work has that ISBN", which is a fact about the record. A title-search hit describes a *work*, whose editions each have their own ISBN, so picking one would be fabrication.

Only the mapped fields are requested (`fields=`), which is the difference between a few hundred bytes per hit and a few hundred kilobytes.

## Running it as a service

A Docker image wraps this package in a small HTTP API, so metadata lookups don't have to happen inside your JavaScript app — and so you can try a provider against a real catalog with curl:

```bash
docker run -p 3000:3000 \
  -e OPEN_LIBRARY_USER_AGENT="MyApp/1.0 (me@example.com)" \
  mbret/prose-metadata-fetcher-api:latest

curl "http://localhost:3000/metadata?isbn=9780441013593"
```

The image is published with every release, tagged with the version and `latest`, for `linux/amd64` and `linux/arm64`.

| Route | |
| --- | --- |
| `GET /health` | liveness, plus the providers the deployment exposes |
| `GET /metadata?title=&author=&isbn=…` | human-friendly lookup |
| `POST /metadata` | body is a `ResolvedArchive` (or a bare `ResolvedMetadata`), options on the query string |

Both metadata routes answer with the `FetchedMetadata` entity verbatim. The options above (`limit`, `minScore`, `includeRaw`, plus a `providers` filter) are query parameters, and the deployment defaults are environment variables.

For development, `npm run start:metadata-fetcher` starts the same image with the source bind-mounted: editing the express app restarts it, editing this package rebuilds it and the API picks it up. It also serves a playground at `/` — enter metadata manually or choose an EPUB/CBZ/ZIP file, then inspect each candidate, its score and the signals behind it. Uploaded files have no application-level size limit: archive-reader resolves them in memory and discards them, and only their plain JSON metadata is sent to `/metadata`, with no disk or browser storage. The playground is development-only: the production image sets `NODE_ENV=production`, and the route is then never registered.

See [the app's README](https://github.com/mbret/prose-reader/tree/master/apps/metadata-fetcher-api) for the full reference.

## Writing a provider

A provider is three things: a stable `id`, a display `name`, and a `search` returning normalized candidates. It never scores its own results — that stays in the package, identically for everyone.

```typescript
import {
  type MetadataProvider,
  metadataAuthors,
} from "@prose-reader/metadata-fetcher"

const myProvider: MetadataProvider = {
  id: "myCatalog",
  name: "My Catalog",
  search: async (metadata, { limit, signal }) => {
    if (metadata.title === undefined) return []

    const response = await fetch(
      `https://example.com/search?q=${encodeURIComponent(metadata.title)}` +
        `&author=${encodeURIComponent(metadataAuthors(metadata)[0] ?? "")}`,
      { signal },
    )
    const { results } = await response.json()

    return results.slice(0, limit).map((result) => ({
      id: result.id,
      url: `https://example.com/book/${result.id}`,
      raw: result,
      metadata: {
        title: result.name,
        isbn: result.isbn,
        contributors: result.authors.map((name) => ({
          name,
          roles: ["author"],
        })),
      },
    }))
  },
}
```

**Both sides of a lookup are `ResolvedMetadata`** — what the book said going in, what the catalog says coming back. There is deliberately no separate "query" shape: the vocabulary is already sparse by contract (`field !== undefined` is a reliable presence check), already normalized, and already carries everything a catalog could key on, down to `metadata.comic` for a comics catalog. A flattened projection would be a second shape to learn that says less.

Two helpers cover the derivations that need more than a field read:

```typescript
import { hasSearchTerms, metadataAuthors } from "@prose-reader/metadata-fetcher"

// contributors credited as `author`, else every contributor — a comic archive
// often credits only a penciler
metadataAuthors(metadata) // ["Frank Herbert"]

// is there anything to go on at all? a publisher or a page count narrows a
// search but cannot start one, so they don't count
if (!hasSearchTerms(resolved.metadata)) return
```

Rules of thumb:

- **Return an empty list, don't throw**, when the metadata carries nothing you can search on. Throwing is for actual failures — they land in `failedProviders`.
- **Throw `MetadataProviderResponseError`** when the catalog answers with a failing status, so the status reaches the caller instead of dying in a log line. Any error carrying a numeric `status` works too, which covers HTTP clients that throw their own:

  ```typescript
  import { MetadataProviderResponseError } from "@prose-reader/metadata-fetcher"

  if (!response.ok) {
    throw new MetadataProviderResponseError(response.status, "My Catalog search failed")
  }
  ```
- **Forward `signal`** to every request you make.
- **Treat `limit` as a page-size hint**; the fetch caps the ranked result anyway.
- **Normalize honestly.** Populate a field only when the record actually states it — a fabricated value is a signal the matcher will score, and a wrong `isbn` is the single most damaging thing you can emit.
- **`raw` is yours**: put your parsed record there for provenance and provider-specific fields with no home in the vocabulary. It is kept only when the consumer asks for it.

The matching primitives are exported too (`scoreMetadataCandidate`, `titleSimilarity`, `personNameSimilarity`, `textSimilarity`, `normalizeForComparison`) if you want to rank something of your own by the same rules — `scoreMetadataCandidate(query, candidate)` takes a `ResolvedMetadata` on both sides, like everything else here.
