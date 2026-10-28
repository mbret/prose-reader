---
title: "Reader settings"
description: "The settings a reader takes, such as spreadMode, pageTurnAnimation and pageTurnMode, and the computed values that say what the reader applies."
sidebar:
  label: "Settings"
---

Settings affecting the reader. Three of the enhancers `createReader` is built with, fonts, layout and [theme](/learn/style-and-css#theme), add theirs to the same `reader.settings` with [`settings.extend`](#settingsextend). Their types, `EnhancerThemeInputSettings`, `EnhancerFontsInputSettings` and `EnhancerLayoutInputSettings`, are exported by `@prose-reader/core`.

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

This observable emits as soon as you subscribe, then once each time the settings change. An update a subscriber makes on an emission reaches every subscriber after that emission.

## `settings.extend`

```typescript
extend<AddedSettings extends object>(
  defaults: SettingsDefaults<AddedSettings>,
  settings: Partial<AddedSettings>,
): SettingsInterface<
  InputSettings & AddedSettings,
  OutputSettings & AddedSettings
>
```

Adds an enhancer's settings to the reader's: the keys of `defaults`, each with the value `settings` gives it, or its default when that value is `undefined`. It returns `reader.settings`, typed with the added settings. The other keys of `settings` are left out, so an enhancer passes the options it was created with. [Adding reader settings](/learn/enhancers#adding-reader-settings) shows an enhancer that does.

An option or an update naming a key that no defaults declare is left out, so `SettingsDefaults` needs a default for every key, `undefined` for an optional one.
