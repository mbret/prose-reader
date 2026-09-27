# Navigation

Navigation is not a simple task and can be done in many ways depending on the
use case. This is why there are two kinds of navigation, **spatial** and
**direct**. The [`.navigation` reference](../core-api/.navigation.md) lists
every method and stream with its signature; this page is about using them.

## Spatial navigation

Useful when you navigate from buttons or gestures: a swipe to the left calls
`turnLeft()`, to the right `turnRight()`. Spatial methods follow the screen,
not the reading direction, so they match what the user sees: in a right-to-left
book, `turnLeft()` goes forward. The same goes for spine items with
`goToLeftSpineItem()` and `goToRightSpineItem()`.

## Direct navigation

`goToCfi()`, `goToUrl()`, `goToSpineItem()`, `goToPageOfSpineItem()` and
`goToAbsolutePageIndex()` are not directional. Use them when you know exactly
where to go: a bookmark, a table of contents entry, a link.

## Reading position

`reader.navigation.readingPosition$` is where the reader is in the book: its
`cfi`, the value to save and to [open the book at](#opening-the-book-somewhere)
the next time, its `percentageEstimateOfBook`, how far into the book that is,
to save with it for a progress shown outside the reader, and `status`, whether
the reader has found that place yet: `pending`, `success`, or `error` when it
can't because the chapter failed to load.

It moves when the reader navigates, and when the page that navigation goes to
is laid out: until then the reading position, or only its progress, stands at
the start of that page's chapter, as the cases below say, and it is `pending`.
After that it is a `success`, and stays for the rest of the navigation. Every
navigation ends in `success`, or in `error` when its chapter fails to load. A
resize, a rotation, a font size change or a chapter loading nearby lays the
book out again and reflows the page around the reading position, but never
changes it.
The [pagination page](pagination.md#pagination-or-reading-position) explains why
that makes it the value to save rather than pagination's `begin.cfi`. It is
also what the reader returns to itself after such a relayout, so a book
reopened at a saved reading position shows the same text as one that was
resized.

It is the reader's own answer, the same whatever the navigation's target: a
cfi, a url, a spine item, a page turn, or a target an enhancer adds. It is set
the moment a navigation happens, and refined as the reader finds out:

- **Until the chapter the navigation goes to is loaded**: that chapter's start,
  the only place a cfi can name in a chapter that is not loaded, `pending`. It
  stands in for a place the reader does not know yet: its `cfi` names only the
  chapter, which `reader.cfi.isRootCfi(cfi)` tells. Nothing shows yet where the
  target leads in the chapter.
- **Once the chapter is loaded**: the place the target names, when the chapter
  holds it, a cfi or the element a url's fragment names, still `pending`, kept
  as it is even once the page holding it shows. Otherwise it stands in until the
  page the navigation lands on is laid out, and is then that page's first
  character: after turning pages, scrolling, `goToSpineItem` or a url without
  a fragment, and for a cfi whose path leads to nothing in its chapter, such as
  a saved position from before the book changed, which takes the reader to the
  chapter's start. A place that isn't rendered, such as a page-break marker the
  book's CSS hides, is where the content after it is: the reader goes to the
  page that content starts on, or to the chapter's last page when nothing
  rendered follows.
- **Once the page holding it is laid out**: `success`, and it stays for the
  rest of the navigation. In a chapter already laid out, such as when turning
  pages, that is at once, even while a chapter after it loads: the book laid
  out again for that one cannot move it. While the book is laid out again in a
  way that can, for a resize, a setting, or a chapter before it loading or
  unloading, it stands in until that layout is done. The change of `status` is
  emitted even when the `cfi` and its progress stay the same, as they can after
  a navigation to a cfi on its chapter's first page.
- **If the chapter fails to load**: `error`, and it stays for the rest of the
  navigation, at what the reader knew by then: the chapter's start, or the
  place the target names if the chapter showed it before failing. The reader
  does not load the chapter again while it stays among the chapters around the
  position, as [Error handling](error-handling.md#errors-in-spine-item)
  explains.

A navigation whose target names nothing in the book, such as a cfi that
[can't be read](../cfi/about.md) or a cfi of a chapter the book does not have,
is ignored with a warning: the reader stays where it is, and so does the
reading position. One made while the navigation is held, such as a pan's,
moves it once released, as [Pans and locks](#pans-and-locks) explains.

Its `percentageEstimateOfBook` is where the page holding the `cfi` starts,
estimated from the `progressionWeight` of each spine item in the manifest, or
an even share each when an item has none, and the pages of its own. It moves
with the `cfi`, never apart from it. When the reading position is a chapter's
start, so is its progress; after a navigation to a cfi, the progress is that
chapter's start until the page holding the cfi is laid out, where the value
becomes a `success`. Being where a page starts, it is short of `1` on the last
page.
Pagination's `percentageEstimateOfBook` measures how far the end of what is
visible reaches instead, so the two differ by about the pages on screen.

### Saving it

Save every value as it comes, whatever its `status`, all its fields together. A
`pending` value is a place the reader has not fully found yet, for as long as a
chapter takes to load and be laid out: its progress is the chapter's start, and
so is its `cfi` while it stands in, until the chapter shows the place the
navigation names, if it names one. It is still where the reader is, as far as
it knows. Keeping the value saved before instead would leave a stale position:
should the reader be closed before the new value is a `success`, the book would
reopen where it was before that navigation.

The one case where a value is far from the reader is a turn back into a
previous chapter that is not loaded yet: until it loads, the reading position
is that chapter's start rather than its last page. Adjacent chapters are
preloaded by default (`numberOfAdjacentSpineItemToPreLoad`), so this only shows
when they are not.

```typescript
reader.navigation.readingPosition$.subscribe((readingPosition) => {
  localStorage.setItem(
    `reading-position-${bookId}`,
    JSON.stringify(readingPosition),
  )
})
```

`status` tells a value this navigation can still refine, `pending`, from a
`success` or an `error`, which stay until the next navigation, for code that
treats them differently, such as a progress shown only once it is exact, or a
message that the chapter could not be shown. A value that is not a `success`
and whose `cfi` names only its chapter stands in at the chapter's start: a sync
client can push one only when the navigation names no better place. Within a
navigation the value only moves forward: while `pending`, from the chapter's
start to the place the target names, then to `success` or `error`, skipping
what does not apply. A navigation to a place already laid out is a `success`
at once.

## Opening the book somewhere

`createReader`'s `target` option is where the reader opens. It takes any
target [`navigate`](../core-api/.navigation.md) does. Without it, the reader
opens at the start of the book. The reader goes there once its chapters are
first laid out, with every enhancer in place, so the reading position never
passes through the start of the book on the way, and a saved position is never
overwritten by the cover.

A saved position can go stale when the book changes, or get corrupted. One
that names nothing in the book opens it at its start, as without a target. One
whose chapter is still there opens that chapter, and the reading position
follows the rules above: that chapter's start until it has loaded, then the
place saved, or the page shown when that place is gone, so what you save from
there reopens the book.

```typescript
const saved = localStorage.getItem(`reading-position-${bookId}`)
const readingPosition: ReadingPosition | undefined = saved
  ? JSON.parse(saved)
  : undefined

const reader = createReader({
  manifest,
  target: readingPosition
    ? { type: "cfi", value: readingPosition.cfi }
    : undefined,
})
```

## Reacting to navigations

`navigation$` emits every navigation as it happens, with its `triggeredBy`:

- `"user"`: a navigation you or a gesture asked for, including the one to where
  the reader opens.
- `"restoration"`: the reader re-applying the current navigation, after the book
  was laid out again or when a pan ends. A restoration is emitted even when it
  lands where the navigation already was: what it tells is that the navigation
  holds on the new layout, where the same position can show other content.

Use it to react to navigating as an event. For where the viewport is,
`position$` emits the position only when it changes, and for what to save,
`readingPosition$`.

## Pans and locks

A gesture that moves the page itself, a pan, has to keep the reader from moving
it at the same time. `panNavigator` holds a lock for the pans it drives, from
`start()` to `stop()`, and the reader holds one while the user scrolls. For a
gesture of your own, take a `lock()` when it starts and release it when it
ends:

```typescript
const release = reader.navigation.lock()

// …the user drags the page…

release()
```

While it is held, the reader does not move the page on its own: the restoration
of a layout that lands meanwhile waits for the release, and so does the snap of
a navigation made while it is held. Locks add up, so the navigation is held
until every one of them is released; a release called twice releases it once.

A navigation made while it is held has not landed anywhere yet, so the
[reading position](#reading-position) stays where it was. Once released, it
moves to where the navigation lands: for a pan, the page it snaps to, which
turns as soon as the next page shows by `navigationSnapThreshold`, often before
that page is the one showing the most.

`isLocked$` turns `false` as soon as the last lock is released, before the
restoration that follows and before any animation still running. To know when
the reader is done moving, watch `navigationState$` for `"free"` instead.
