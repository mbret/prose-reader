# Navigation

Navigation is not a simple task and can be done in many ways depending on the use case. This is why we have two categories of navigation; **spatial** and **direct.**

## Spatial navigation

Often useful when you want to navigate based on buttons or gesture. For example a swipe to the left triggers a `turnLeft`, to the right a `turnRight`. It's easier to call these spatial methods because it correlates directly with what the user is expecting and is especially useful for UX elements.&#x20;

## Direct navigation

These represent methods such as `goToItem`, `goToPage`, `goToUrl`, etc. They are not directional nor spatial and are used when you know exactly where you want to go. They are usually used for navigating by bookmarks, table of contents, links and other.

## Reading position

```typescript
reader.navigation.readingPosition$: Observable<string>
```

Where the reader is in the book, as a cfi: the value to save, and to pass back
as the `cfi` option to reopen the book there. It replays the current one on
subscription, and emits nothing until the first navigation has a position.

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
  it is, even once the page holding it shows.
- **Any other navigation**, turning pages, scrolling, `goToSpineItem` or
  `goToUrl`: the first character of the page it goes to. It does not wait for
  the page turn to end or for pagination to settle; the page is known as soon
  as its chapter is laid out.
- **A navigation into a chapter that is not loaded yet**: that chapter's start,
  the only place a cfi can name in a document that is not loaded. Once the
  chapter has loaded, it becomes the first character of the page the
  navigation lands on, and stays there.

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

## `navigation.navigation$` and `navigation.position$`

`navigation$` emits every navigation as it happens, with its `triggeredBy`:

- `"user"`: a navigation you or a gesture asked for.
- `"restoration"`: the reader re-applying the current navigation, after the book
  was laid out again or when a pan ends. A restoration is emitted even when it
  lands where the navigation already was: what it tells is that the navigation
  holds on the new layout, where the same position can show other content.

Use it to react to navigating as an event. For where the viewport is,
`position$` emits the position only when it changes.



```typescript
type NavigationState = {
  /**
   * Spatial indicator whether you can turn
   * page to the left to reach a new spine item
   */
  canGoLeftSpineItem: boolean
  /**
   * Spatial indicator whether you can turn
   * page to the right to reach a new spine item
   */
  canGoRightSpineItem: boolean
  /**
   * Spatial indicator whether you can turn
   * page to the top to reach a new spine item
   */
  canGoTopSpineItem: boolean
  /**
   * Spatial indicator whether you can turn
   * page to the bottom to reach a new spine item
   */
  canGoBottomSpineItem: boolean
}
```

## `navigation.state$`

```typescript
Observable<NavigationState>
```

Emits as soon as you subscribe to it.

## `navigation.goToNextSpineItem()`

Navigate to the next available spine item.

## `navigation.goToPreviousSpineItem()`

Navigate to the previous available spine item.

## `navigation.goToLeftSpineItem()`

Navigate to the next spine item available at the left.  It will never navigate if the pages turn vertically.

## `navigation.goToRightSpineItem()`

Navigate to the next spine item available at the right. It will never navigate if the pages turn vertically.
