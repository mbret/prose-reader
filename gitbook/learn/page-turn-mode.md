# Page Turn Mode

<div align="center"><figure><img src="../.gitbook/assets/localhost_9000_reader_aHR0cDovL2xvY2FsaG9zdDo5MDAwL2VwdWJzL3JlbmRpdGlvbi1mbG93LXdlYnRvb24uZXB1Yg==_free&#x26;vertical(iPhone SE) (3).png" alt="" width="188"><figcaption></figcaption></figure> <figure><img src="../.gitbook/assets/localhost_9000_reader_aHR0cDovL2xvY2FsaG9zdDo5MDAwL2VwdWJzL3JlbmRpdGlvbi1mbG93LXdlYnRvb24uZXB1Yg==_free&#x26;vertical(iPhone SE) (2) (1).png" alt="" width="188"><figcaption></figcaption></figure></div>

The `pageTurnMode` setting says how the reader moves through the book:

* `controlled` (the default): page by page, with the page turn animation you choose.
* `scrollable`: by scrolling down, one chapter after another.

```typescript
const reader = createReader({ manifest, pageTurnMode: "scrollable" })

reader.settings.update({ pageTurnMode: "controlled" }) // lays the book out again
```

A book whose `rendition:flow` is `scrolled-continuous` asks to be scrolled, and is always read that way: `reader.features.value.supportedPageTurnMode` is then `["scrollable"]`. Any other book (`paginated`, or `auto`, which is what most declare) is paginated by default, and scrolled when you set `pageTurnMode` to `scrollable`. The EPUB specification lets a reading system override the book's preference this way.

What the reader does is `computedPageTurnMode`. Read it rather than the setting, which reads back as you gave it:

```typescript
reader.settings.values.computedPageTurnMode // "controlled" or "scrollable"
```

## How a scrolled book is laid out

* **Reflowable text** is one column per chapter, as wide as the page and as tall as its content. The page margins (`pageHorizontalMargin`, `pageVerticalMargin`) are at the sides of the text, and before and after each chapter.
* **Text written vertically** stays paginated, its pages one below the other: one column of it would have to scroll sideways.
* **Reflowable images**, such as the pages of a webtoon, take the page's width at their own height.
* **Pre-paginated pages** keep their page size, one below the other.

The whole book follows the reader's mode. A chapter that declares its own `rendition:flow` is laid out like the others.

A chapter counts as one page, whatever its height: a turn to the next page scrolls one screen down, and pagination reports one page per chapter.

## Known limitations

* A chapter above the screen that finishes loading while you scroll changes height, and the text under you moves by as much ([#508](https://github.com/mbret/prose-reader/issues/508)). Once you stop scrolling, a chapter loading above keeps the text in place.

These come from a chapter counting as one page:

* The reading position and pagination name the start of the chapter at the top of the screen, however far into it you have scrolled ([#467](https://github.com/mbret/prose-reader/issues/467)). A position saved there reopens at the chapter's start.
* Going to a place inside a chapter that is not loaded yet, such as a saved position, lands at the chapter's start. Going to a place inside a loaded chapter shows it. After a relayout, such as a resize, the reader keeps its distance from the chapter's start rather than the text it was on ([#407](https://github.com/mbret/prose-reader/issues/407)).
