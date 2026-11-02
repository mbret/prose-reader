---
title: "reader.zoom"
description: "Enter, scale, move and leave a zoom with reader.zoom, read its state, and see how it behaves in the controlled and scrollable page turn modes."
sidebar:
  label: ".zoom"
---

The reference for `reader.zoom`. The [zoom guide](/learn/zoom) explains how a
zoom works: it transforms the viewport rather than the book, and it behaves
differently in a book that scrolls.

Every reader `createReader` returns has it. `@prose-reader/core` exports its
type, `ZoomEnhancerOutput`, and `ZoomPosition`.

## Zooming

### `.enter()`

```typescript
(options?: {
  scale?: number
  animate?: boolean
}) => void
```

Starts a zoom: `isZooming` becomes `true`, and the viewport scales to `scale`,
`1` by default, around the center of what the user sees. `animate`, `false` by
default, eases the change over 200 ms, in controlled page turn mode only.

`.state$` reports the zoom at a scale of `1` first, then at `scale`. Called
during a zoom, `.enter()` starts a new one, from the center of the viewport.

```typescript
reader.zoom.enter({ scale: 2, animate: true })
```

### `.scaleAt()`

```typescript
(scale: number, options?: { constrain?: "within-viewport" }) => void
```

Scales the viewport during a zoom, around the center of what the user sees.
Does nothing outside a zoom: call `.enter()` first. It never animates, and it
rounds `scale` up to two decimals. It sets no limit on the scale: keep it within
the range your app allows. `constrain` is described under
[Constraining the position](#constraining-the-position).

```typescript
reader.zoom.enter()
reader.zoom.scaleAt(1.5, { constrain: "within-viewport" })
```

### `.move()`

```typescript
(position: ZoomPosition, options?: { constrain?: "within-viewport" }) => void

type ZoomPosition = { x: number; y: number }
```

Moves the zoomed viewport to `position`: the offset, in pixels, of its top-left
corner from where it sits at rest. Controlled page turn mode only: in scrollable
mode it does nothing, since the user scrolls a zoomed book. It never animates,
and it does not check that a zoom is in progress.

To move by a distance, add it to the current position:

```typescript
reader.zoom.move(
  {
    x: reader.zoom.state.currentPosition.x + deltaX,
    y: reader.zoom.state.currentPosition.y + deltaY,
  },
  { constrain: "within-viewport" },
)
```

### `.exit()`

```typescript
(options?: { animate?: boolean }) => void
```

Ends the zoom: the viewport goes back to a scale of `1` and to its place, and
`isZooming` becomes `false`. `animate` eases it over 200 ms, in controlled page
turn mode only.

```typescript
const toggleZoom = () => {
  if (reader.zoom.state.isZooming) {
    reader.zoom.exit({ animate: true })
  } else {
    reader.zoom.enter({ scale: 2, animate: true })
  }
}
```

## Constraining the position

`.scaleAt()` and `.move()` take `constrain: "within-viewport"` to keep a zoomed
in viewport over the whole reading area, so that no empty edge shows. The
position is clamped:

- `x` between `clientWidth × (1 − scale)` and `0`
- `y` between `clientHeight × (1 − scale)` and `0`

`clientWidth` and `clientHeight` are the size of the viewport element, unscaled.
Zoomed out, below a scale of `1`, the clamp holds the viewport at
`{ x: 0, y: 0 }`. Without `constrain`, the position is used as given. In
scrollable page turn mode, `constrain` has no effect.

## Observing the zoom

### `.state$` { #stateusd }

```typescript
Observable<{
  isZooming: boolean
  currentScale: number
  currentPosition: ZoomPosition
}>
```

The state as soon as you subscribe, then each change. It completes when the
reader is destroyed. Its type is `ZoomEnhancerOutput["zoom"]["state"]`.

| Field | Meaning |
| --- | --- |
| `isZooming` | `true` from `.enter()` until `.exit()` |
| `currentScale` | The scale of the viewport: `1` at rest, above `1` zoomed in, below `1` zoomed out |
| `currentPosition` | The offset of the zoomed viewport in controlled page turn mode, the one `.move()` sets or that scaling around the center gives |

`currentPosition` is `{ x: 0, y: 0 }` before the first zoom and after `.exit()`
in controlled mode. Scrollable mode does not track it: `.enter()` sets it to
`{ x: 0, y: 0 }` and nothing else changes it, not even `.exit()`. A zoom that
began in controlled mode and goes on after a switch to scrollable mode keeps its
last offset until the next `.enter()`.

```typescript
import { distinctUntilChanged, map } from "rxjs"

reader.zoom.state$
  .pipe(
    map(({ isZooming, currentScale }) => isZooming && currentScale > 1),
    distinctUntilChanged(),
  )
  .subscribe((isZoomedIn) => {
    // show your zoom controls while the book is zoomed in
  })
```

### `.state` { #state }

```typescript
{
  isZooming: boolean
  currentScale: number
  currentPosition: ZoomPosition
}
```

The latest state of `.state$`, read synchronously. Before the first zoom it is
`{ isZooming: false, currentScale: 1, currentPosition: { x: 0, y: 0 } }`.

## Page turn modes

A zoom works differently in each [page turn mode](/learn/page-turn-mode):

| | Controlled | Scrollable |
| --- | --- | --- |
| How the viewport zooms | A CSS transform that offsets it, then scales it from its top-left corner | A CSS scale, then a scroll that keeps what was at the center of the screen there |
| `animate` | Eases the change over 200 ms | Has no effect |
| `.move()` | Moves the zoomed viewport | Does nothing: the user scrolls, sideways too when zoomed in |
| `constrain` | Clamps the position | Has no effect |
| `currentPosition` | The offset of the viewport | Not tracked, see [`.state$`](#stateusd) |

Each change lays the reader out again, since what is visible changed. In
controlled mode, `.enter()` with a scale other than `1`, and `.exit()`, lay it
out once more when their animation ends.

## Gestures

Gestures are not part of this API. The
[Gestures](/enhancers/gestures#zooming-in-out) enhancer drives it:

- A pinch that spreads enters the zoom at the scale of its first move, then
  scales it with `constrain: "within-viewport"`. No move goes past its
  `zoomMaxScale` setting, and a `zoomMaxScale` of `1` or less keeps a pinch
  from zooming in.
- A pinch that takes the scale below `1` exits it.
- While the book is zoomed in, a pan moves the zoom rather than the page, and a
  tap no longer turns the page.
