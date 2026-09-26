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
the next time, and its `percentageEstimateOfBook`, how far into the book that
is, to save with it for a progress shown outside the reader.

It moves when the reader navigates, and when the page that navigation goes to
is laid out: until then the reading position, or only its progress, stands at
the start of that page's chapter, as the cases below say. After that it stays
for the rest of the navigation. A resize, a rotation, a font size change or a
chapter loading nearby lays the book out again and reflows the page around the
reading position, but never changes it. The
[pagination page](pagination.md#pagination-or-reading-position) explains why
that makes it the value to save rather than pagination's `begin.cfi`. It is
also what the reader returns to itself after such a relayout, so a book
reopened at a saved reading position shows the same text as one that was
resized.

It is set the moment a navigation happens:

- **A navigation to a cfi**, with `goToCfi` or by opening the book at one:
  that cfi. It names the exact place asked for, so it is kept as
  it is, even once the page holding it shows. A url whose fragment names an
  element, with `goToUrl` or a link, is kept the same way: as the cfi of that
  element.
- **Any other navigation**, turning pages, scrolling, `goToSpineItem`, or a url
  without a fragment: the first character of the page it goes to. It does not
  wait for the page turn to end or for pagination to settle; the page is known
  as soon as its chapter is laid out.
- **A navigation into a chapter that is not loaded yet**: that chapter's start,
  the only place a cfi can name in a document that is not loaded. Once the
  chapter has loaded, it becomes the first character of the page the
  navigation lands on, or the element a url names, and stays there.
- **A navigation to a cfi whose path leads to nothing in its chapter**, such as
  a saved position from before the book changed: the reader goes to the
  chapter's start. Until the chapter is loaded, such a cfi cannot be told from
  one naming a place, so the reading position is the cfi as it was given. Once
  the chapter has loaded, it becomes the first character of the page shown, and
  stays there.

A navigation whose target names nothing in the book, such as a malformed cfi or
a cfi of a chapter the book does not have, is ignored with a warning: the reader
stays where it is, and so does the reading position.

Its `percentageEstimateOfBook` is where the page holding the `cfi` starts,
estimated from the `progressionWeight` of each spine item in the manifest, or
an even share each when an item has none, and the pages of its own. It moves with the `cfi`, never apart from it. When the
reading position is a chapter's start, so is its progress; after a navigation
to a cfi, the progress is that chapter's start until the page holding the cfi
is laid out. Being where a page starts, it is short of `1` on the last page.
Pagination's `percentageEstimateOfBook` measures how far the end of what is
visible reaches instead, so the two differ by about the pages on screen.

Save every value as it comes, both fields together. The one case where a value
is far from the reader is a turn back into a previous chapter that is not
loaded yet: until it loads, the reading position is that chapter's start
rather than its last page. Adjacent chapters are preloaded by default
(`numberOfAdjacentSpineItemToPreLoad`), so this only shows when they are not.

```typescript
reader.navigation.readingPosition$.subscribe((readingPosition) => {
  localStorage.setItem(
    `reading-position-${bookId}`,
    JSON.stringify(readingPosition),
  )
})
```

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
follows the rules above: a place in the chapter that is gone becomes the page
shown once the chapter has loaded, so what you save from there reopens the
book.

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

`isLocked$` turns `false` as soon as the last lock is released, before the
restoration that follows and before any animation still running. To know when
the reader is done moving, watch `navigationState$` for `"free"` instead.
