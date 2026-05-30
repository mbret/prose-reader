# Settings

Settings affecting the reader.

```typescript
export type InputSettings = {
  forceSinglePageMode: boolean
  pageTurnAnimation: `none` | `fade` | `slide`
  pageTurnAnimationDuration: undefined | number
  /**
   * Direction of page turning. This affect how the book
   * is layout as well. This is useful to know this information
   * when you want to have gesture which match the page direction
   * for example.
   */
  pageTurnDirection: `vertical` | `horizontal`
  pageTurnMode: `controlled` | `scrollable`
  navigationSnapThreshold: number
  numberOfAdjacentSpineItemToPreLoad: number
}

export type OutputSettings = InputSettings & {
  computedPageTurnMode: "controlled" | "scrollable"
  computedPageTurnDirection: "vertical" | "horizontal"
  computedPageTurnAnimation: "none" | "fade" | "slide"
  computedPageTurnAnimationDuration: number
  computedSnapAnimationDuration: number
}
```

{% hint style="warning" %}
Some settings have their `computed` counterpart. When you read the settings you should always read the `computed` one. This indicates whether the reader is actually using the settings you provided. In some cases you may want to use a setting that is not compatible with the current book. The reader will not crash but fall back on a valid value (`computed`...)
{% endhint %}

## `settings.settings$`

```typescript
Observable<OutputSettings>
```

This observable emits as soon as you subscribe.
