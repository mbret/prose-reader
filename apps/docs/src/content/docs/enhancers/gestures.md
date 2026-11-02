---
title: "Gestures enhancer"
description: "Add swipe, pan, tap and pinch gestures to the reader with @prose-reader/enhancer-gestures, configure them, and react to each gesture through gestures$."
sidebar:
  label: "Gestures"
---

:::caution
On Node, this package requires `>=22.12`. It recognizes gestures with
[`gesturx`](https://www.npmjs.com/package/gesturx), which is ESM-only from version 2,
so reaching this package through `require()` needs the `require(esm)` support that
landed unflagged in Node 22.12. `import` and bundler builds are unaffected.
:::

This enhancer implements common gesture patterns using [https://github.com/mbret/gesturx](https://github.com/mbret/gesturx). Tap on edge  or swipe to turn pages, pinch to zoom, etc. It implements the most common gestures while trying to stay generic and configurable.

## Getting Started

```bash
npm install @prose-reader/enhancer-gestures @prose-reader/core gesturx rxjs
```

All three are peer dependencies. The enhancer runs against the reader your app
creates, so it shares that reader's `@prose-reader/core` rather than bringing
its own. It needs the core it was released with or a later one of the same
major, gesturx 2 (`^2.0.0`), and rxjs 7.5.5 or any later 7.x (`^7.5.5`).

Connect the enhancer to your reader:

```typescript
import { gesturesEnhancer } from "@prose-reader/enhancer-gestures"

const createAppReader = gesturesEnhancer(createReader)

/**
 * There is no required configuration for this
 * enhancer.
 */
const reader = createAppReader({ manifest })
```

## Gestures Container

Gesture recognitions are done relative to the reader container by default. This is to ensure consistency in behaviors no matter how your reader is being integrated.

For example, we detect taps on edge of screen to navigate pages. If we were using `window` object as reference, tapping on the side of the book would not work in this situation:

<figure><img src="/images/gestures-container.webp" alt="A reader in the middle of a wider page: the edge of the book, where a tap turns the page, is far from the edge of the window" width="717" height="473"></figure>

In this situation the user is using the reader in only a certain part of the web page and therefore the gestures should work relative to the reader container.

## Patterns recognized

### Navigation

* **Swipe** to turn pages
* **Pan** to turn pages
* **Tap** to turn pages

Gestures start on a press of the primary button: a left click, a finger or a pen's tip. A right click, which opens the context menu, and a middle click start none: they tap, pan and swipe nothing, turn no page and are not reported on `gestures$`.

### Zooming (in/out) { #zooming-in-out }

* **Pinch** to start zooming
* **Pan** to move zoom position (When zooming)

## API

The API is under the `gestures` namespace.

```typescript
type Options = {
  panNavigation?: "pan" | "swipe" | false
  /**
   * The highest scale a pinch zooms to, `Infinity` by default.
   * At `1` or less, a pinch never zooms in.
   */
  zoomMaxScale?: number
  pinchCancelPan?: boolean
  /**
   * List of selectors that will be tested to ignore gestures.
   * eg: preventing gestures on a bookmark button.
   */
  ignore?: string[]
}
```

With [react-reader](/react-reader/getting-started), set `zoomMaxScale` with the
`zoomMaxScale` prop of `ReactReader` instead, `5` by default: react-reader
writes it over this setting.

### `.settings`

Read or update the enhancer settings.

### `.hooks`

```typescript
type PageContext = undefined | {
  spineItem: SpineItem
  spineItemPageIndex: number
  spineItemPagePosition: UnsafeSpineItemPagePosition
  pageSize: {
    width: number
    height: number
  }
}
    
type Hook = {
  /**
   * Use this hook to control whether a gesture should be recognized or not.
   * eg: You can check whether a gesture is on a bookmark button and cancel it.
   */
  name: "beforeTapGesture"
  runFn: (
    params: { event$: Observable<{ event: GestureEvent; page: PageContext }> }
  ) => Observable<boolean>
}
```

### `.gestures$` { #gesturesusd }

```typescript
Observable<{
    type: "tap";
    gestureEvent: TapEvent;
    handled: boolean;
} | {
    type: "pan";
    gestureEvent: PanEvent;
} | {
    type: "swipe";
    gestureEvent: SwipeEvent;
} | {
    type: "pinch";
    gestureEvent: PinchEvent;
}>
```

Emits all gesture events that are recognized and processed by the enhancer. It will attach a boolean to let you know whether the gesture has been handled or not. Typically whether an action happened following this gesture (like a passthrough).

It completes when the reader is destroyed.

Imagine you want to show/hide a menu when the user clicks on the screen. The enhancer will trigger a navigation when the user taps on the left or right edge so you likely don't want to show the menu at the moment. However clicking outside of this range will have no effect. This is where you can intercept the gesture and show your menu.

```typescript
/**
 * Here we have a tap event that does not trigger any effects.
 * We can fallback to trigger the menu.
 */
reader?.gestures.gestures$.pipe(
  tap((event) => {
    if (event.type === "tap" && !event.handled) {
      toggleMenu()
    }
  })
)
```

Basically if you want to do something based on a gesture and make sure it does not happen with another effect this observable is a good candidate.

## Resizing text with a pinch

A pinch zooms. To have it resize the text instead, keep it from zooming with a
`zoomMaxScale` of `1`, and update `fontScale` from the pinch events of
[`gestures$`](#gesturesusd):

```typescript
import {
  asyncScheduler,
  filter,
  map,
  switchMap,
  takeWhile,
  throttleTime,
} from "rxjs"

const reader = createAppReader({ manifest, gestures: { zoomMaxScale: 1 } })

const pinchEvents$ = reader.gestures.gestures$.pipe(
  filter((gesture) => gesture.type === "pinch"),
  map(({ gestureEvent }) => gestureEvent),
)

pinchEvents$
  .pipe(
    filter((event) => event.type === "pinchStart"),
    switchMap(() => {
      const fontScaleAtPinchStart = reader.settings.values.fontScale

      return pinchEvents$.pipe(
        takeWhile((event) => event.type !== "pinchEnd", true),
        // Each change of font scale lays the book out again
        throttleTime(500, asyncScheduler, { leading: true, trailing: true }),
        // `scale` counts from the start of the pinch
        map((event) =>
          Math.min(Math.max(fontScaleAtPinchStart * event.scale, 0.5), 3),
        ),
      )
    }),
  )
  .subscribe((fontScale) => {
    reader.settings.update({ fontScale })
  })
```

The text follows the pinch from the font scale it had when the pinch started,
between `0.5` and `3` here, and ends at the scale of the pinch's last move.
