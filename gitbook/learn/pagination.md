# Pagination

`reader.pagination` gives you access to the current book pagination information. It can be used to know which page is being read, how many pages are in a chapter or other such information.



## `type PaginationInfo`

A pagination result describes the two edges of what is visible. Both edges are
the same shape, so they are the same type rather than two sets of prefixed
fields: read `pagination.begin.cfi` rather than `pagination.beginCfi`.

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

type PaginationInfo = {
  begin: PaginationEdge
  end: PaginationEdge
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
