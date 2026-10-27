---
title: "Reader settings"
description: "The settings a reader takes, such as spreadMode, pageTurnAnimation and pageTurnMode, and the computed values that say what the reader applies."
sidebar:
  label: "Settings"
---

Settings affecting the reader. The enhancers `createReader` is built with add settings of their own to the same `reader.settings`, such as [`theme`](/learn/style-and-css#theme). Their types, `EnhancerThemeInputSettings`, `EnhancerFontsInputSettings` and `EnhancerLayoutInputSettings`, are exported by `@prose-reader/core`.

```typescript
export type InputSettings = {
  /**
   * When two pages share the viewport: `auto` from the viewport's size and
   * the book, `always` in every orientation, `never` one page at a time.
   */
  spreadMode: `auto` | `always` | `never`
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
  snapAnimationDuration: number
  navigationSnapThreshold:
    | { type: "percentage"; value: number }
    | { type: "pixels"; value: number }
  numberOfAdjacentSpineItemToPreLoad: number
}

export type OutputSettings = InputSettings & {
  computedPageTurnMode: "controlled" | "scrollable"
  computedPageTurnDirection: "vertical" | "horizontal"
  computedPageTurnAnimation: "none" | "fade" | "slide"
  computedPageTurnAnimationDuration: number
}
```

:::caution
Some settings have their `computed` counterpart. When you read the settings you should always read the `computed` one. This indicates whether the reader is actually using the settings you provided. In some cases you may want to use a setting that is not compatible with the current book. The reader will not crash but fall back on a valid value (`computed`...)
:::

`spreadMode` has no `computed` counterpart in the settings, because whether a spread is shown also depends on the viewport's size. The viewport resolves it in every layout, and `reader.viewport.value.isSpread` is what the reader shows. See [Spread mode](/learn/viewport#spread-mode).

## `settings.values$` { #settings.valuesusd }

```typescript
Observable<OutputSettings>
```

This observable emits as soon as you subscribe, then once each time the settings change.
