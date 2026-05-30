# Pagination

`reader.pagination` gives you access to the current book pagination information. It can be used to know which page is being read, how many pages are in a chapter or other such information.



## `type PaginationInfo`

<pre class="language-typescript"><code class="lang-typescript">type PaginationInfo = {
  beginCfi: string | undefined
  beginSpineItemIndex: number | undefined
  beginChapterInfo: ChapterInfo | undefined
  beginPageIndexInSpineItem: number | undefined
  beginNumberOfPagesInSpineItem: number | undefined
  beginSpineItemReadingDirection: `rtl` | `ltr` | undefined
  beginAbsolutePageIndex: number | undefined
  endCfi: string | undefined
  endSpineItemIndex: number | undefined
  endChapterInfo: ChapterInfo | undefined
  endPageIndexInSpineItem: number | undefined
  endNumberOfPagesInSpineItem: number
  endSpineItemReadingDirection: `rtl` | `ltr` | undefined
  endAbsolutePageIndex: number | undefined
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

Save current cfi into localStorage for loading a book at the previous location:

<pre class="language-typescript"><code class="lang-typescript">// save cfi into localstorage
reader.pagination.paginationInfo$.subscribe((paginationInfo) => {
<strong>    localStorage.setItem(`cfi`, paginationInfo.beginCfi)
</strong>})

// when we load the book
reader.load(manifest, {
<strong>    containerElement: document.getElementById(`reader`),
</strong>    cfi: localStorage.getItem(`cfi`)
})
</code></pre>

## `pagination.getPaginationInfo()`

```
PaginationInfo
```

Static method to return the pagination info. Be careful since it can return an invalid pagination (For example if no book is loaded).
