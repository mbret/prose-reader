# Metadata Fetcher

**`@prose-reader/metadata-fetcher`** is the "what the book says in → what the catalogs know out" package. Where [archive-reader](../archive-reader/README.md) resolves the metadata a container *carries*, this one goes looking for the metadata it *lacks*: a cover for a bare CBZ, a synopsis and subjects for an EPUB whose OPF only states a title, the series a scene-released comic belongs to.

It takes a `ResolvedMetadata` — or anything carrying one, which is exactly the `ResolvedArchive` shape — asks a list of **pluggable providers**, scores every candidate against what the book itself said, and gives back the same `ResolvedMetadata` vocabulary, plus the per-provider detail behind it:

```typescript
import { resolveArchive } from "@prose-reader/archive-reader"
import {
  createOpenLibraryProvider,
  fetchMetadata,
} from "@prose-reader/metadata-fetcher"

const resolved = await resolveArchive(archive)
const fetched = await fetchMetadata(resolved, {
  providers: [createOpenLibraryProvider()],
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
  failedProviders: string[]
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

- **A stated identifier settles it.** An agreeing ISBN or GTIN pins the score to `1` whatever else disagrees; a *contradicting* one scores `0` at the heaviest weight, which is what sinks a plausible-looking wrong edition. ISBN-10 and ISBN-13 of the same book compare equal (`toIsbn13` is exported).
- **Comparisons are fuzzy where the world is.** Titles compare on character bigrams with the subtitle asymmetry repaired (`Dune` ≡ `Dune: a novel`, but `Dune: Book One` ≠ `Dune: Messiah`); names compare on their token set (`Herbert, Frank` ≡ `Frank Herbert`); diacritics and punctuation are folded (`Les Misérables` ≡ `Les Miserables`); languages compare on their primary subtag (`en-US` ≡ `en`).

`minScore` (default `0.5`) decides which matches are `accepted` — which ones contribute to the merged `metadata`. Rejected matches are **kept and ranked**, not dropped: "the catalog found three books, none convincing" is an answer, and it is exactly what a "did you mean?" picker renders.

```typescript
if (fetched.metadata.title === undefined) {
  showPicker(fetched.matches) // nothing convincing — let the user choose
}
```

## Options

```typescript
const fetched = await fetchMetadata(resolved, {
  providers: [createOpenLibraryProvider()],
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

Mirrors `resolveArchive`: a provider that throws — a network error, a rate limit, a malformed response — never fails the fetch. It is logged through the debug `Report` and listed in `failedProviders`, the only trace left:

```typescript
// don't persist "we found nothing" when we simply couldn't ask
if (fetched.failedProviders.length === 0) cache.set(bookId, fetched)
```

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
| `createOpenLibraryProvider` | `@prose-reader/metadata-fetcher` | [Open Library](https://openlibrary.org) | free, no key; books broadly, comics and manga much less so |

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

**Lookup strategy**, at most two requests: an ISBN search when the book states one — the catalog then verifies the identity for us — falling back to a title (+ first author) search when the ISBN is unknown to it or absent. A query with neither an ISBN nor a title yields no candidates rather than a fishing expedition.

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
| `key` | `identifiers` | scheme `OpenLibrary`, e.g. `/works/OL893415W`; also `id` and `url` on the match |

`isbn` is set **only** when the search was an ISBN lookup, and then it is the queried one: the API answered "this work has that ISBN", which is a fact about the record. A title-search hit describes a *work*, whose editions each have their own ISBN, so picking one would be fabrication.

Only the mapped fields are requested (`fields=`), which is the difference between a few hundred bytes per hit and a few hundred kilobytes.

## Writing a provider

A provider is three things: a stable `id`, a display `name`, and a `search` returning normalized candidates. It never scores its own results — that stays in the package, identically for everyone.

```typescript
import type { MetadataProvider } from "@prose-reader/metadata-fetcher"

const myProvider: MetadataProvider = {
  id: "myCatalog",
  name: "My Catalog",
  search: async (query, { limit, signal }) => {
    if (query.title === undefined) return []

    const response = await fetch(
      `https://example.com/search?q=${encodeURIComponent(query.title)}`,
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

The `query` is what we know locally, reduced to the terms a catalog can search on — so a provider never walks the union vocabulary looking for a title:

```typescript
type MetadataQuery = {
  title?: string
  /** contributors credited as author, else every contributor */
  authors?: string[]
  isbn?: string
  gtin?: string
  identifiers?: { value: string; scheme?: string }[]
  series?: string
  publisher?: string
  languages?: string[]
  published?: { year?: number; month?: number; day?: number }
  numberOfPages?: number
  /** everything known locally, verbatim — the escape hatch */
  metadata: ResolvedMetadata
}
```

Rules of thumb:

- **Return an empty list, don't throw**, when the query carries nothing you can search on. Throwing is for actual failures — they land in `failedProviders`.
- **Forward `signal`** to every request you make.
- **Treat `limit` as a page-size hint**; the fetch caps the ranked result anyway.
- **Normalize honestly.** Populate a field only when the record actually states it — a fabricated value is a signal the matcher will score, and a wrong `isbn` is the single most damaging thing you can emit.
- **`raw` is yours**: put your parsed record there for provenance and provider-specific fields with no home in the vocabulary. It is kept only when the consumer asks for it.

`buildMetadataQuery` is exported if you need to build a query yourself (a provider test, a UI form), and so are the matching primitives (`scoreMetadataCandidate`, `titleSimilarity`, `personNameSimilarity`, `textSimilarity`, `normalizeForComparison`) if you want to rank something of your own by the same rules.
