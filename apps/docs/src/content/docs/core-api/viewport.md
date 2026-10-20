---
title: "reader.viewport"
description: "The reader.viewport reference: its size and page size at each layout, whether it shows a spread, its scale while zoomed, and whether it is moving."
sidebar:
  label: ".viewport"
---

The reference for `reader.viewport`, the element that frames what the reader
shows. The [viewport guide](/learn/viewport) explains how to use it: what it is
for, how to resize it, spread mode, and the absolute and relative viewports.

The viewport is measured at the start of each layout of the reader:

- when the reader is mounted;
- when you call `reader.layout()`;
- when the container the reader is mounted into changes size, unless
  `layoutAutoResize` is `false`, see
  [My book does not resize with my screen](/get-started/troubleshooting-faq#my-book-does-not-resize-with-my-screen);
- when a setting that moves the pages changes, such as `spreadMode`, the page
  turn mode or direction, or the page margins.

Its size, its page size and whether it shows a spread change only then. A
spine item that finishes loading lays the items out again, but does not
measure the viewport.

:::note
When you change the size of the viewport, call `reader.layout()` so that the
reader measures it again, see
[Adjusting size, margin, etc](/learn/viewport#adjusting-size-margin-etc).
`reader.viewport.layout()` is the measurement that layout starts with. Called
on its own, it records a size the book was not laid out for.
:::

## State

### `.value` { #value }

```typescript
{
  element: HTMLElement
  isSpread: boolean
  pageSize: { width: number; height: number }
  width: number
  height: number
}
```

The state of the latest layout, read synchronously.

| Field | Meaning |
| --- | --- |
| `element` | The viewport's element: a `div` with the `data-prose-reader-viewport` attribute, inside the container the reader is mounted into. It holds the pages, and a zoom transforms it |
| `width`, `height` | The size of the element in CSS pixels at the last layout, from its `clientWidth` and `clientHeight`, which leave out a scrollbar and ignore a transform. This is the absolute viewport |
| `isSpread` | Whether two pages share the viewport: the `spreadMode` setting, resolved against the viewport's size and the book. See [Spread mode](/learn/viewport#spread-mode) |
| `pageSize` | The size of one page: the viewport's size, or half its width in a spread |

Before the reader is first laid out, the state is a placeholder: `width`,
`height` and both sides of `pageSize` are `1`, and `isSpread` is `false`.

### `.state$` { #stateusd }

```typescript
Observable<typeof reader.viewport.value>
```

The state as soon as you subscribe, then the state of every layout, changed or
not. To react to a change, watch the fields you need with `.watch()`.
`reader.viewport` is itself an observable of the same states: subscribing to it
is subscribing to `.state$`. Both complete when the reader is destroyed.

### `.watch()` { #watch }

```typescript
type ViewportState = typeof reader.viewport.value

watch<K extends keyof ViewportState>(key: K): Observable<ViewportState[K]>
watch<K extends keyof ViewportState>(keys: K[]): Observable<Pick<ViewportState, K>>
```

One field, or several, as soon as you subscribe, then whenever a layout changes
them. A single field is compared by its value, and `pageSize` by its width and
height. In a list, each field is compared as it is, so `pageSize`, a new object
at every layout, counts as changed every time: watch it on its own.

```typescript
reader.viewport.watch("isSpread").subscribe((isSpread) => {
  // true while two pages share the viewport
})

reader.viewport.watch(["width", "height"]).subscribe(({ width, height }) => {
  // the size of the viewport, after each layout that changes it
})
```

### `.layout$` { #layoutusd }

```typescript
Observable<void>
```

Emits each time the viewport is measured for a layout, right after the state of
that layout. The book is not laid out yet: `reader.layout$` emits once its pages
are.

## Sizes

### `.pageSize` { #pagesize }

```typescript
{ width: number; height: number }
```

The size of one page at the last layout, the same as `.value.pageSize`.
Renderers size their pages from it, as the PDF and audio enhancers do.

### `.absoluteViewport` { #absoluteviewport }

```typescript
{ width: number; height: number }
```

The size the book is laid out for: the `width` and `height` of the last layout.
Navigation and pagination compute with it, see
[Absolute vs Relative viewport](/learn/viewport#absolute-vs-relative-viewport).

### `.relativeViewport` { #relativeviewport }

```typescript
{ width: number; height: number }
```

The area the viewport shows once transformed, such as by a zoom: the absolute
viewport divided by `.scaleFactor`. Zoomed out to half the size, it is twice as
large as the absolute viewport.

### `.scaleFactor` { #scalefactor }

```typescript
number
```

The scale the viewport is rendered at: its rendered width over its layout
width, both measured when you read it. `2` when zoomed in to twice the size,
`0.5` when zoomed out to half, and `1` when the viewport is not transformed or
has no rendered size.

:::caution
Reading `.scaleFactor` or `.relativeViewport` measures the element with
`getBoundingClientRect()`, which can make the browser compute styles and
layout. Read them when you need the value, not on every frame.
:::

## Spreads

### `.wouldSpreadAt()` { #wouldspreadat }

```typescript
(size: { width: number; height: number }) => boolean
```

Whether a viewport of this size would show two pages side by side, for the
current book and `spreadMode` setting. It is the rule every layout applies to
the viewport's own size, so it tells what a rotation or a resize would show
before it happens. `.value.isSpread` is what is shown now. The guide's
[Spread mode](/learn/viewport#spread-mode) uses it to anticipate a rotation.

## Whether the viewport moves

Two streams on the reader itself, rather than on `reader.viewport`, say whether
the viewport is moving.

### `reader.viewportState$` { #viewportstateusd }

```typescript
Observable<"free" | "busy">
```

The same state as
[`reader.navigation.navigationState$`](/core-api/navigation#navigationstateusd):
`"busy"` while the viewport moves, while a navigation lock is held, and while
the reader restores the navigation after one is released, `"free"` otherwise.
It replays the current state when you subscribe.

```typescript
reader.viewportState$.subscribe((state) => {
  // "busy" while a page turns, "free" once it has landed
})
```

### `reader.viewportFree$` { #viewportfreeusd }

```typescript
Observable<"free">
```

Emits each time the viewport becomes free, and at once if it is free when you
subscribe. The reader waits for it before it loads or unloads the document of a
spine item. Do the same with work that should not run while a page turns:

```typescript
import { first } from "rxjs"

reader.viewportFree$.pipe(first()).subscribe(() => {
  // the viewport is not moving
})
```
