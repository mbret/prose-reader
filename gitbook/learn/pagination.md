# Pagination

`reader.pagination` gives you access to the current book pagination information. It can be used to know which page is being read, how many pages are in a chapter or other such information.



## `type PaginationInfo`

A pagination result describes the two edges of what is visible. Both edges are
the same shape, so they are the same type rather than two sets of prefixed
fields: read `pagination.begin.cfi` rather than `pagination.beginCfi`.

`PaginationInfo` is a discriminated union. Settlement is the only thing the two
variants differ in, and it is expressed on the edges: a settled result's edges
have resolved positions, so their `cfi` is typed as present.

```typescript
type PaginationInfo = ExtraPaginationInfo &
  (
    | { isSettled: false; begin: PaginationEdge; end: PaginationEdge }
    | {
        isSettled: true
        begin: PaginationEdge & { cfi: string }
        end: PaginationEdge & { cfi: string }
      }
  )
```

<pre class="language-typescript"><code class="lang-typescript">type PaginationEdge = {
  cfi: string | undefined
  spineItemIndex: number | undefined
  pageIndexInSpineItem: number | undefined
  numberOfPagesInSpineItem: number
  // added by the pagination enhancer
  chapterInfo: ChapterInfo | undefined
  spineItemReadingDirection: `rtl` | `ltr` | undefined
  absolutePageIndex: number | undefined
}

type ExtraPaginationInfo = {
  /*
   * This percentage is based of the weight (kb) of every items and the number of pages.
   * It is not accurate but gives a general good idea of the overall progress.
   */
  percentageEstimateOfBook: number | undefined
<strong>  /**
</strong>   * This value is only correct for pre-paginated books and or
   * if you preload the entire book in case of reflow. This is because
   * items get loaded unloaded when navigating through the book, meaning
   * we cannot measure the number of pages accurately.
   */
  numberOfTotalPages: number | undefined
  isUsingSpread: boolean
  canGoLeft: boolean
  canGoRight: boolean
}
</code></pre>

## `pagination.paginationInfo$`

```typescript
Observable<PaginationInfo>
```

Observable that emits whenever a new valid pagination info is updated. It will not emit invalid pagination.&#x20;

### Examples

Save current cfi into localStorage for opening a book at the previous location:

<pre class="language-typescript"><code class="lang-typescript">// save cfi into localstorage
reader.pagination.paginationInfo$.subscribe((paginationInfo) => {
<strong>    if (!paginationInfo.isSettled) return
</strong>
<strong>    localStorage.setItem(`cfi`, paginationInfo.begin.cfi)
</strong>})

// when we create the reader for the book
const reader = createReader({
<strong>    manifest,
</strong>    cfi: localStorage.getItem(`cfi`) ?? undefined
})

reader.mount(document.getElementById(`reader`))
</code></pre>

## `pagination.getPaginationInfo()`

```
PaginationInfo
```

Static method to return the pagination info. Be careful since it can return an invalid pagination (For example if no book is loaded).

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

Settlement ends as soon as a navigation starts, a layout starts, or a visible
item stops being ready, and returns once a replacement result has resolved over
the new state. A layout is not only one you request: the reader lays the spine
out again whenever an item finishes loading or unloads, so settlement can drop
briefly while the book loads around the page being read. Page metrics such as
`begin.pageIndexInSpineItem` stay available throughout, so navigation controls
keep working on estimates while a result is pending.

It describes the current visible position, not the loading state of the whole
book: a settled result does not mean every item has been loaded.
