# Gestures

This enhancer implements common gesture patterns using [https://github.com/mbret/gesturx](https://github.com/mbret/gesturx). Tap on edge  or swipe to turn pages, pinch to change font scale, etc. It implements the most common gestures while trying to stay generic and configurable.

## Getting Started

```bash
npm install @prose-reader/enhancer-gestures
```

Connect the enhancer to your reader:

```typescript
import { gesturesEnhancer } from "@prose-reader/enhancer-gestures"

const createAppReader = gesturesEnhancer(createReader)

/**
 * There is no required configuration for this
 * enhancer.
 */
const reader = createAppReader({})
```

## Gestures Container

Gesture recognitions are done relative to the reader container by default. This is to ensure consistency in behaviors no matter how your reader is being integrated.

For example, we detect taps on edge of screen to navigate pages. If we were using `window` object as reference, tapping on the side of the book would not work in this situation:

<figure><img src="../.gitbook/assets/image (1).png" alt=""><figcaption></figcaption></figure>

In this situation the user is using the reader in only a certain part of the web page and therefore the gestures should work relative to the reader container.

## Patterns recognized

### Navigation

* **Swipe** to turn pages
* **Pan** to turn pages
* **Tap** to turn pages

### Zooming (in/out)

* **Pinch** to start zooming
* **Pan** to move zoom position (When zooming)

### Font size change

* **Pinch** to start changing font size. This will take priority over zooming for reflowable books and whenever the user does not start pinching on an image.

## API

The API is under the `gestures` namespace.

```typescript
type Options = {
  panNavigation?: "pan" | "swipe" | false
  fontScalePinchEnabled?: boolean
  fontScaleMaxScale?: number
  fontScaleMinScale?: number
  fontScalePinchThrottleTime?: number
  pinchCancelPan?: boolean
  /**
   * List of selectors that will be tested to ignore gestures.
   * eg: preventing gestures on a bookmark button.
   */
  ignore?: string[]
}
```

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

### `.gestures$`

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
