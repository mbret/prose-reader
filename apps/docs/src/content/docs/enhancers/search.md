---
title: "Search enhancer"
description: "Add full-text search to a prose reader: find a word or phrase anywhere in an EPUB or PDF, with a CFI for each match to locate it or go to it."
sidebar:
  label: "Search"
---

## Getting Started

```bash
npm install @prose-reader/enhancer-search rxjs
```

`rxjs` is the package's peer dependency, in the same `^7.5.5` range as
`@prose-reader/core`.

Connect the enhancer to your reader:

```typescript
import { createReader } from "@prose-reader/core"
import { searchEnhancer } from "@prose-reader/enhancer-search"

const createAppReader = searchEnhancer(createReader)

/**
 * There is no configuration for this enhancer.
 */
const reader = createAppReader({ manifest })
```

## API

The API is under the `search` namespace. The package exports its types:

```typescript
type SearchEnhancerAPI = {
  readonly __PROSE_READER_ENHANCER_SEARCH: boolean
  search: {
    search: (text: string) => Observable<SearchResult>
  }
}

type SearchResult = ResultItem[]

type ResultItem = {
  cfi: string
}
```

Code that receives a reader can check for `__PROSE_READER_ENHANCER_SEARCH`
to know whether it was created with this enhancer.

### `.search()`

```typescript
function search(text: string): Observable<SearchResult>
```

Looks for `text` in the whole book. The observable emits once, with every
match in reading order: spine item after spine item, then in the order of the
document. Then it completes. An empty `text` emits an empty list.

Each result holds the CFI of a range that covers one match.

```typescript
reader.search.search("whale").subscribe((results) => {
  console.log(`${results.length} matches`)
})
```

Unsubscribing cancels the search. To search as the user types, let each query
replace the previous one with `switchMap`:

```typescript
import { debounceTime, distinctUntilChanged, Subject, switchMap } from "rxjs"

const query$ = new Subject<string>()

query$
  .pipe(
    debounceTime(500),
    distinctUntilChanged(),
    switchMap((text) => reader.search.search(text)),
  )
  .subscribe((results) => {
    // display the results
  })

searchInput.addEventListener("input", () => query$.next(searchInput.value))
```

## Locating and opening a result

A result only holds a CFI. Pass the results to
[`reader.locateResource()`](/core-api/reader/locateresource) to know where
each one is: its spine item (`itemIndex`), its page in the item
(`itemPageIndex`) and in the book (`absolutePageIndex`), and the matched
`range` once the item is loaded.

```typescript
import { switchMap } from "rxjs"

reader.search
  .search("whale")
  .pipe(switchMap((results) => reader.locateResource(results)))
  .subscribe((locatedResults) => {
    for (const { resource, meta } of locatedResults) {
      console.log(resource.cfi, meta.itemIndex, meta.absolutePageIndex)
    }
  })
```

`locateResource()` loads each reflowable item it locates, to find the page of
the match, and emits again after every layout. With many results, locate the
ones you display, or pass `{ mode: "shallow" }` to locate them without loading
items.

Go to a result with
[`reader.navigation.goToCfi()`](/core-api/navigation#gotocfi):

```typescript
reader.navigation.goToCfi(result.cfi)
```

## How it searches

A search renders every spine item headless: it gets a document for the item
apart from the displayed book, searches it and releases it. See
[Headless Rendering](/learn/headless-rendering). Each step waits until the
browser is idle, with `requestIdleCallback`, or a timeout where it is not
available.

What can be searched depends on the item:

- **EPUB chapters and other HTML or XML documents**: the resource is parsed
  when its response has a `Content-Type` of `application/xhtml+xml`,
  `application/xml`, `text/html` or `text/xml`.
- **PDF pages**, with the [PDF enhancer](/enhancers/pdf): the text layer of
  the page is searched, so a scanned page without text has no matches.
- **Comic pages and other images, and audio tracks** have no text to search.
- **Plain-text books** (`text/plain`) are not parsed, so they have no matches
  either.

:::caution
The `Content-Type` has to be one of these values exactly. A server that adds a
parameter, such as `text/html; charset=utf-8`, gets no matches from that
document. For an EPUB chapter, the [Streamer](/learn/streamer) sends the media
type the package document lists, without a parameter.
:::

An item that fails to load or to be searched adds no results, and the search
still completes.

## Matching

- Case does not matter: `whale` also finds "Whale".
- A match has to be within one text node. A phrase that inline markup splits,
  such as `white <em>whale</em>`, is not found as a whole, though each of its
  words is.
- Whitespace has to match the document as written: a space in the text does
  not match a line break or a non-breaking space.

:::caution
The text becomes a regular expression without escaping. Characters that have a
meaning in a regular expression, such as `.`, `?`, `*`, `+`, `|`, `(` or `[`,
are read as pattern syntax rather than matched. `s.me` also finds "some",
`C++` finds nothing, and a text that can match an empty string, such as `a?`
or `|`, makes the search loop forever and freezes the page. Search for words,
digits and spaces.
:::
