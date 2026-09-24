# Pagination

`reader.pagination` describes what is visible: which spine items and pages are
on screen, where they are in the book and whether that position has resolved.
Use it for everything the reader sees: which page is being read, how many pages
are in a chapter, how far into the book they are. The
[`.pagination` reference](../core-api/.pagination.md) lists `state$`, `state`
and every field of a result; this page is about using them.

It is not what to save to reopen the book where the reader left it. That is the
reading position, and the next section explains the difference.

## Pagination or reading position

Two values describe where the reader is, and they answer different questions:

| | `reader.pagination` | `reader.navigation.readingPosition$` |
| --- | --- | --- |
| Answers | What is on screen now | Where the reader is in the book |
| Moves when | The reader navigates, and whenever the book is laid out again: a resize, a rotation, a font size change, a chapter loading nearby | Only when the reader navigates |
| Use it for | Page numbers, progress bars, the current chapter's title | Saving progress, reopening the book, syncing the position to another device |

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

reader.mount(document.getElementById("reader")!)
```

The [navigation page](navigation.md#reading-position) says exactly when the
reading position changes.

Anything else you save from pagination, a progress percentage for a library
screen for example, has to come from a settled result, as explained in
[Settlement](#settlement).

## Reading the stream

`reader.pagination.state$` emits the current result as soon as you subscribe,
then every new one. `reader.pagination.state` is its latest result, read
synchronously.

The reader smooths this stream on purpose. A result is built from several
sources (layout, navigation, the loaded documents), and while the reader
changes state they do not all update at once. Rather than emit each
intermediate combination, the stream waits for them to agree, so it can briefly
lag behind the reader. A result is only settled once it describes the reader's
current position. `state` lags the same way: it is the stream's latest result,
not a fresher one.

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

The reading position needs no such check: every value it takes is the closest
known position of the reader's latest navigation, as the
[navigation page](navigation.md#reading-position) explains.
