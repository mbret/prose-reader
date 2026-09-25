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

`reader.navigation.readingPosition$` is where the reader is in the book, as a
cfi: the value to save, and to pass back as the `cfi` option to reopen the book
there.

It only moves when the reader navigates. A resize, a rotation, a font size
change or a chapter loading nearby lays the book out again and reflows the page
around the reading position, but never changes it. The
[pagination page](pagination.md#pagination-or-reading-position) explains why
that makes it the value to save rather than pagination's `begin.cfi`. It is
also what the reader returns to itself after such a relayout, so a book
reopened at a saved reading position shows the same text as one that was
resized.

It is set the moment a navigation happens:

- **A navigation to a cfi**, with `goToCfi` or by opening the book with the
  `cfi` option: that cfi. It names the exact place asked for, so it is kept as
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

Save every value as it comes. The one case where a value is far from the reader
is a turn back into a previous chapter that is not loaded yet: until it loads,
the reading position is that chapter's start rather than its last page.
Adjacent chapters are preloaded by default
(`numberOfAdjacentSpineItemToPreLoad`), so this only shows when they are not.

```typescript
reader.navigation.readingPosition$.subscribe((cfi) => {
  localStorage.setItem(`reading-position-${bookId}`, cfi)
})
```

## Reacting to navigations

`navigation$` emits every navigation as it happens, with its `triggeredBy`:

- `"user"`: a navigation you or a gesture asked for.
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
