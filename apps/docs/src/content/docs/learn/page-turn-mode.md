---
title: "Page Turn Mode"
description: "Choose between paginated reading with page turns and continuous vertical scrolling for webtoons, comics and PDF, and set the direction and animation of a turn."
---

## Two modes

`pageTurnMode` decides how the user moves through a book:

- `controlled`, the default: the reader shows one page, or one spread, at a time, and moves to another when the user turns the page.
- `scrollable`: the reader stacks the book from top to bottom in an area that scrolls, and the user scrolls through it.

Set it when you create the reader, or change it at any time. A change lays the book out again.

```typescript
import { createReader } from "@prose-reader/core"

const reader = createReader({
  manifest,
  pageTurnMode: "scrollable",
})

reader.settings.update({ pageTurnMode: "controlled" })
```

Three more settings shape a page turn, and scrollable mode overrides all three:

| Setting | Default | In scrollable mode |
| --- | --- | --- |
| `pageTurnDirection` | `horizontal` | always `vertical` |
| `pageTurnAnimation` | `slide` | always `none` |
| `pageTurnAnimationDuration` | `undefined`, which means 300 ms | 0 |

## Controlled mode

The reader moves the book itself, a page or a spread at a time. A pan follows the finger and snaps to a page when the user lets go, see [Pans and locks](/learn/navigation#pans-and-locks).

The page turns:

- on `reader.navigation.turnLeft()`, `turnRight()`, `turnTop()` and `turnBottom()`, see [Spatial navigation](/learn/navigation#spatial-navigation);
- on the arrow keys of the page turn direction;
- on a tap in the margins, a swipe or a pan, with the [Gestures](/enhancers/gestures) enhancer.

### Direction

`pageTurnDirection` sets the axis pages turn along:

- `horizontal`, the default: the pages sit side by side and turn left and right, with ArrowLeft and ArrowRight.
- `vertical`: the spine items are stacked from top to bottom and turn up and down, with ArrowUp and ArrowDown. `turnRight()` goes down like `turnBottom()`, and `turnLeft()` goes up like `turnTop()`.

### Animation

`pageTurnAnimation` animates a turn:

- `slide`, the default: the book slides to the new page.
- `fade`: the book fades out, moves, and fades back in.
- `none`: the new page shows at once.

The animation lasts `pageTurnAnimationDuration` milliseconds. Every navigation you ask for animates, unless you turn it off for that navigation, as `goToCfi(cfi, { animate: false })` does. The reader's own moves never do: opening the book, and returning to the reading position after a layout. The snap that ends a pan always slides, for `snapAnimationDuration` milliseconds.

A book written vertically cannot slide. When `pageTurnAnimation` is `slide`, its pages turn without animation, and `fade` still works. If its first pages still slide, see [Troubleshooting](/get-started/troubleshooting-faq#i-have-a-vertical-reading-book-but-the-first-page-is-using-slide-turn).

## Scrollable mode

The reader stacks the spine items from top to bottom in an element that scrolls vertically. The user scrolls through the book rather than turning its pages.

- Navigations jump to their target, without animation, and do not snap to a page. `turnRight()` and `turnBottom()` scroll down by the height of the viewport, `turnLeft()` and `turnTop()` scroll up.
- The reader leaves the arrow keys alone. The [Gestures](/enhancers/gestures) enhancer turns its pan and swipe navigation off, and a tap in the margins does not turn the page.
- The [reading position](/learn/navigation#reading-position) follows the scroll. The reader holds a [lock](/learn/navigation#pans-and-locks) while the user scrolls, and records where the user is half a second after the scrolling stops.

Scrollable mode suits content laid out to scroll: webtoons and other long strips, and the pages of comics, manga and PDF. The [Refit](/enhancers/refit) enhancer narrows the viewport in this mode only, and [Zoom](/learn/zoom) behaves differently in it.

:::caution
A reflowable text book, such as a novel, is still paginated in scrollable mode unless its rendition flow is `scrolled-continuous`. Each chapter keeps its pages side by side in columns, and only the chapters are stacked, so scrolling skips every page of a chapter after its first one. Keep such a book in controlled mode.
:::

## Books that always scroll

A book whose `rendition:flow` is `scrolled-continuous`, such as a webtoon, is shown in scrollable mode whatever `pageTurnMode` says. A reflowable document in such a book is as tall as its content, so a webtoon reads as one continuous strip. The book is never shown in a spread either, see [Spread mode](/learn/viewport#spread-mode).

## Reading what the reader uses

The settings keep the values you gave. The reader uses their computed counterparts, see [Settings](/learn/settings):

```typescript
const { computedPageTurnMode, computedPageTurnDirection } =
  reader.settings.values

reader.settings
  .watch(["computedPageTurnMode"])
  .subscribe(({ computedPageTurnMode }) => {
    // "controlled" or "scrollable", for the current book
  })
```

For a settings screen, `reader.features` lists the values the current book supports. The [demo](/get-started/demo-and-showcase) disables its choices from it.

```typescript
const {
  supportedPageTurnMode,
  supportedPageTurnDirection,
  supportedPageTurnAnimation,
} = reader.features.value

reader.features
  .watch("supportedPageTurnMode")
  .subscribe((supportedPageTurnMode) => {
    // ["controlled", "scrollable"], or ["scrollable"] for a book that always scrolls
  })
```

- `supportedPageTurnMode` is `["scrollable"]` for a `scrolled-continuous` book.
- `supportedPageTurnDirection` is `["vertical"]` in scrollable mode, and `["horizontal"]` for a book whose manifest declares it reflowable.
- `supportedPageTurnAnimation` is `["none"]` in scrollable mode, and has no `slide` for a book written vertically.
