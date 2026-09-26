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
to save with it for a progress shown outside the reader, and `isFinal`,
whether the reader has found where the navigation took it.

It is the reader's own answer, the same whatever the navigation's target: a
cfi, a url, a spine item, a page turn, or a target an enhancer adds. It is set
the moment a navigation happens, and refined as the reader finds out:

- **Until the chapter the navigation goes to is loaded**: that chapter's
  start, the only place a cfi can name in a chapter that is not loaded, not
  final. Nothing shows yet where the target leads in the chapter.
- **Once the chapter is loaded**: the place the target names, when the chapter
  holds it, a cfi or the element a url's fragment names, kept as it is even once
  the page holding it shows. Otherwise the first character of the page the
  navigation lands on, once that page is laid out: after turning pages,
  scrolling, `goToSpineItem` or a url without a fragment, and for a cfi whose
  path leads to nothing in its chapter, such as a saved position from before
  the book changed, which takes the reader to the chapter's start.
- **Once the page holding it is laid out**: final, and it stays for the rest of
  the navigation. In a chapter already laid out, such as when turning pages,
  that is at once.

A resize, a rotation, a font size change or a chapter loading nearby lays the
book out again and reflows the page around the reading position, but never
changes it. The [pagination page](pagination.md#pagination-or-reading-position)
explains why that makes it the value to save rather than pagination's
`begin.cfi`. It is also what the reader returns to itself after such a
relayout, so a book reopened at a saved reading position shows the same text as
one that was resized.

A navigation whose target names nothing in the book, such as a cfi that
[can't be read](../cfi/about.md) or a cfi of a chapter the book does not have,
is ignored with a warning: the reader stays where it is, and so does the
reading position.

Its `percentageEstimateOfBook` is where the page holding the `cfi` starts,
estimated from the `progressionWeight` of each spine item in the manifest, or
an even share each when an item has none, and the pages of its own. It moves
with the `cfi`, never apart from it: until the value is final, it is the start
of the chapter the navigation goes to. Being where a page starts, it is short of
`1` on the last page. Pagination's `percentageEstimateOfBook` measures how far
the end of what is visible reaches instead, so the two differ by about the
pages on screen.

### Saving it

A value that is not final is the closest the reader knows so far, coarser than
where it is going: its chapter's start while the chapter loads, and that start
as the progress until the page is laid out. A navigation to a cfi or a url
reports the chapter's start until the chapter loads, and so does a turn back
into a previous chapter that is not loaded yet, rather than its last page.
Adjacent chapters are preloaded by default (`numberOfAdjacentSpineItemToPreLoad`),
so this mostly shows when opening the book, and around chapters that are not
preloaded. Saving every value as it comes is enough when a chapter's start will
do for the time a chapter takes to load and be laid out, the only time a value
is not final. Should the reader be closed then, it reopens at that chapter's
start.

The target a navigation asked for is yours, and stays available as
`reader.navigation.getNavigation().target`. A cfi, a url or an xpointer already
names a place: to never save anything coarser, save it until the reading
position is final. With a cfi, including the one the book opened at:

```typescript
reader.navigation.readingPosition$.subscribe(
  ({ cfi, percentageEstimateOfBook, isFinal }) => {
    const { target } = reader.navigation.getNavigation()
    // Until the reader has found where it is, a cfi you sent it to is finer.
    const cfiToSave = !isFinal && target.type === "cfi" ? target.value : cfi

    localStorage.setItem(
      `reading-position-${bookId}`,
      JSON.stringify({ cfi: cfiToSave, percentageEstimateOfBook }),
    )
  },
)
```

The [koreader enhancer](../enhancers/koreader.md) does the same for the
xpointers it reports.

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
const readingPosition: { cfi: string } | undefined = saved
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

`isLocked$` turns `false` as soon as the last lock is released, before the
restoration that follows and before any animation still running. To know when
the reader is done moving, watch `navigationState$` for `"free"` instead.
