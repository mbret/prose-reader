# Pagination

`reader.pagination` describes what is visible: which spine items and pages are
on screen, where they are in the book and whether that position has resolved.
It can be used to know which page is being read, how many pages are in a
chapter, or to save the reading progress.

## `reader.pagination.state$`

```typescript
Observable<EnhancerPaginationInfo>
```

Emits the current result as soon as you subscribe, then every new one.

The reader smooths this stream on purpose. A result is built from several
sources (layout, navigation, the loaded documents), and while the reader
changes state they do not all update at once. Rather than emit each
intermediate combination, the stream waits for them to agree, so it can briefly
lag behind the reader. A result is only settled once it describes the reader's
current position.

## `reader.pagination.state`

```typescript
EnhancerPaginationInfo
```

The current result, read synchronously. Until a book has been laid out it is an
unsettled result with empty edges: no `cfi`, no `spineItemIndex`, no page index.

## Types

A pagination result describes the two edges of what is visible. Both edges are
the same shape, so they are the same type rather than two sets of prefixed
fields: read `pagination.begin.cfi` rather than `pagination.beginCfi`.

The result the reader exposes is the core result enriched by the pagination
enhancer, which every reader created with `createReader` includes. Both are
exported from `@prose-reader/core`.

### `type PaginationInfo`

The core result: the two edges and whether their positions have resolved.

```typescript
type PaginationEdge = {
  cfi: string | undefined
  spineItemIndex: number | undefined
  pageIndexInSpineItem: number | undefined
  numberOfPagesInSpineItem: number
}

type PaginationInfo =
  | { isSettled: false; begin: PaginationEdge; end: PaginationEdge }
  | {
      isSettled: true
      begin: PaginationEdge & { cfi: string }
      end: PaginationEdge & { cfi: string }
    }
```

`PaginationInfo` is a discriminated union. Settlement is the only thing the two
variants differ in, and it is expressed on the edges: a settled result's edges
have resolved positions, so their `cfi` is typed as present.

### `type EnhancerPaginationInfo`

What `reader.pagination.state` and `reader.pagination.state$` carry. It
discriminates on `isSettled` exactly like `PaginationInfo`, over an edge that
carries more, and adds fields that describe the book as a whole.

```typescript
type EnhancerPaginationEdge = PaginationEdge & {
  chapterInfo: ChapterInfo | undefined
  spineItemReadingDirection: `rtl` | `ltr` | undefined
  absolutePageIndex: number | undefined
}

type ExtraPaginationInfo = {
  /**
   * Based on the `progressionWeight` of every spine item in the manifest and
   * on the pages of the current one. It is not accurate but gives a good
   * general idea of the overall progress.
   */
  percentageEstimateOfBook: number | undefined
  /**
   * This value is only correct for pre-paginated books and or
   * if you preload the entire book in case of reflow. This is because
   * items get loaded unloaded when navigating through the book, meaning
   * we cannot measure the number of pages accurately.
   */
  numberOfTotalPages: number | undefined
  isUsingSpread: boolean
}

/**
 * The table of contents entry the edge is in, nested down to the most
 * specific one.
 */
type ChapterInfo = {
  title: string
  path: string
  subChapter?: ChapterInfo
}

type EnhancerPaginationInfo = ExtraPaginationInfo &
  (
    | {
        isSettled: false
        begin: EnhancerPaginationEdge
        end: EnhancerPaginationEdge
      }
    | {
        isSettled: true
        begin: EnhancerPaginationEdge & { cfi: string }
        end: EnhancerPaginationEdge & { cfi: string }
      }
  )
```

Whether you can turn a page or reach another spine item is not part of
pagination. It is on [`reader.navigation.state$`](navigation.md)
(`canGoLeftSpineItem`, `canGoRightSpineItem`, and so on).

## Saving reading progress

A pagination result describes a moment that may still be resolving. While a
document loads, or during a navigation or a layout, an edge's `cfi` can describe
the start of an item rather than the page actually being read. Saving those
overwrites real progress with a placeholder.

`isSettled` tells the two apart. A settled result describes the visible pages of
the current layout over content that is ready, and it is the only variant whose
edges have their `cfi` typed as present — so TypeScript makes you establish
settlement before reading one:

```typescript
reader.pagination.state$.subscribe((state) => {
  if (!state.isSettled) return

  localStorage.setItem("cfi", state.begin.cfi)
})
```

Pass the saved `cfi` when you create the reader the next time to open the book
where it was left:

```typescript
const reader = createReader({
  manifest,
  cfi: localStorage.getItem("cfi") ?? undefined,
})

reader.mount(document.getElementById("reader")!)
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
