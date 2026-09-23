# Pagination

`reader.pagination` describes what is visible right now: which pages are on
screen, how many pages the chapter has, how far into the book they are. Use it
for everything the reader sees.

It is not what to save to reopen the book where the reader left it. That is the
reading position, and the next section explains the difference.

## Pagination or reading position

Two values describe where the reader is, and they answer different questions:

| | `reader.pagination` | `reader.navigation.readingPosition$` |
| --- | --- | --- |
| Answers | What is on screen now | Where the reader is in the book |
| Moves when | The reader navigates, and whenever the book is laid out again: a resize, a rotation, a font size change, a chapter loading nearby | Only when the reader navigates |
| Use it for | Page numbers, progress bars, the current chapter's title, enabling navigation controls | Saving progress, reopening the book, syncing the position to another device |

Pagination moves on a relayout because its `cfi` is the first visible character
of the page, and a relayout cuts the pages differently. Say the reader turned
to a page that starts at the word "Alice", then rotates the phone. The page
holding "Alice" now starts a few words earlier, at "said", and pagination's
`begin.cfi` becomes "said", while the reader has not moved. Save that and
reopen the book in the first orientation, and it opens on the page holding
"said", which is the page before. Every save after a rotation moves the reader
back again. The reading position stays "Alice", so the book reopens on the
page the reader turned to, at any size.

Save the reading position, and reopen at it with the `cfi` option:

```typescript
reader.navigation.readingPosition$.subscribe((cfi) => {
  localStorage.setItem(`reading-position-${bookId}`, cfi)
})

// the next time this book is opened
const reader = createReader({
  manifest,
  cfi: localStorage.getItem(`reading-position-${bookId}`) ?? undefined,
})
```

The [navigation page](navigation.md#reading-position) says exactly when the
reading position changes.

Anything else you save from pagination, a progress percentage for a library
screen for example, has to come from a settled result, as explained in
[Settlement](#settlement).

## `reader.pagination.state$`

```typescript
Observable<EnhancerPaginationInfo>
```

Emits the current result on subscription, then every new one.

## `reader.pagination.state`

```typescript
EnhancerPaginationInfo
```

The current result.

## The pagination result

A result describes the two edges of what is visible. Both edges are the same
shape, so they are the same type rather than two sets of prefixed fields: read
`pagination.begin.cfi` rather than `pagination.beginCfi`.

It is a discriminated union. Settlement is the only thing the two variants
differ in, and it is expressed on the edges: a settled result's edges have
resolved positions, so their `cfi` is typed as present.

```typescript
type EnhancerPaginationInfo = ExtraPaginationInfo &
  (
    | { isSettled: false; begin: EnhancerPaginationEdge; end: EnhancerPaginationEdge }
    | {
        isSettled: true
        begin: EnhancerPaginationEdge & { cfi: string }
        end: EnhancerPaginationEdge & { cfi: string }
      }
  )

type EnhancerPaginationEdge = PaginationEdge & {
  chapterInfo: ChapterInfo | undefined
  spineItemReadingDirection: `rtl` | `ltr` | undefined
  absolutePageIndex: number | undefined
}

type PaginationEdge = {
  cfi: string | undefined
  spineItemIndex: number | undefined
  pageIndexInSpineItem: number | undefined
  numberOfPagesInSpineItem: number
}

type ExtraPaginationInfo = {
  /**
   * Based on the weight (kb) of every item and the number of pages. It is not
   * accurate, but gives a good idea of the overall progress.
   */
  percentageEstimateOfBook: number | undefined
  /**
   * Only correct for pre-paginated books, or if you preload the entire book
   * in case of reflow: items load and unload as the reader navigates, so the
   * number of pages of the whole book cannot be measured otherwise.
   */
  numberOfTotalPages: number | undefined
  isUsingSpread: boolean
}
```

`PaginationInfo`, the result of the core reader without the pagination
enhancer, is the same union over `PaginationEdge`, without
`ExtraPaginationInfo`.

## Settlement

A pagination result describes a moment that may still be resolving. While a
document loads, or during a navigation or a layout, an edge's `cfi` can describe
the start of an item rather than the page actually being read.

`isSettled` tells the two apart. A settled result describes the visible pages of
the current layout over content that is ready, and it is the only variant whose
edges have their `cfi` typed as present, so TypeScript makes you establish
settlement before reading one:

```typescript
reader.pagination.state$.subscribe((state) => {
  if (!state.isSettled) return

  saveProgress(bookId, state.percentageEstimateOfBook)
})
```

Settlement ends as soon as a navigation starts, a layout starts, or a visible
item stops being ready, and returns once a replacement result has resolved over
the new state. A layout is not only one you request: the reader lays the spine
out again whenever an item finishes loading or unloads, so settlement can drop
briefly while the book loads around the page being read. Page metrics such as
`begin.pageIndexInSpineItem` stay available throughout, so navigation controls
keep working on estimates while a result is pending.

It describes the current visible position, not the loading state of the whole
book: a settled result does not mean every item has been loaded.

The reading position never takes a provisional position, so it needs no such
check.
