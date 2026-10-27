---
title: "Style & CSS"
description: "Style a prose reader: its theme, the stable data attributes, rules scoped to one reader instance, and injecting an enhancer's styles with injectScopedCSS."
---

## Theme

The `theme` setting sets the reader's colors, `bright` by default. Like the reader's other [settings](/learn/settings), you give it to `createReader`, change it with `reader.settings.update()`, and read it from `reader.settings.values`, or follow it with `reader.settings.watch(["theme"])`.

```typescript
const reader = createReader({ manifest, theme: "night" })

reader.settings.update({ theme: "sepia" })
```

| Theme | Background | Text |
| --- | --- | --- |
| `bright` | `white` | the book's |
| `sepia` | `#eaddc7` | `black` |
| `night` | `#191717` | `#f1ebeb` |
| `publisher` | the book's, on a `white` reader | the book's |

The background also fills the reader's container wherever the pages do not cover it, and the placeholder page shown while an item loads, whose text takes a gray that suits the theme. Reflowable documents take the theme's background. The elements in their body take its text color, unless the book's own styles set a more specific one. Pre-paginated documents, such as comic pages and PDF pages, keep their own colors: the theme's background shows around them, and through any part of a page that paints no background.

`getThemeBackgroundColor()` gives the background the reader paints with a theme. Use it to match your interface to the reader as the theme changes:

```typescript
import { getThemeBackgroundColor } from "@prose-reader/core"
import { map } from "rxjs"

reader.settings
  .watch(["theme"])
  .pipe(map(({ theme }) => getThemeBackgroundColor(theme)))
  .subscribe((background) => {
    toolbar.style.backgroundColor = background
  })
```

The reader's container also holds that background in the `--prose-reader-theme-background-color` CSS variable, exported as `CSS_VAR_THEME_BACKGROUND_COLOR`, and the placeholder's text color in `--prose-reader-theme-placeholder-color`, exported as `CSS_VAR_THEME_PLACEHOLDER_COLOR`, for the styles of elements you place inside it.

## Stable constants

For convenience with CSS, prose reader defines some constants that will **NEVER** change. This allows you to create stable stylesheets when needed.

* `data-prose-reader-container` data attributes placed on each reader container. Note that without the ID, it targets all reader containers.
* `data-prose-reader-viewport` data attributes placed on the viewport element.

## Reader instance & Considerations { #reader-instance-and-considerations }

When you want to add or override some styles, be careful whether you want to target all readers or the specific one the enhancer is attached to. All data-attributes used have an ID attached to it. You need to target the specific ID together with the data attribute if you want to apply your style to a specific reader instance.

You can retrieve the reader id with `reader.id`.

You will not be able to use this statically inside .css files since it is not possible to use variables in selectors. Check the next sections to see the strategies on how to add your styles.

## Adding / Overriding styles strategies { #adding-overriding-styles-strategies }

### Global vs Per Instance

If you are adding style for your plugin or enhancer, you may want to be careful when targeting the reader elements. In order for your style to be scoped to a specific reader instance, you need to consider using either:

* Reader ID: The ID is unique per instance
* Enhancer own scope: Alternatively you can use your own enhancer scope to put your CSS under

Always consider the fact that an enhancer is attached to a specific reader instance and therefore should not have its style leak outside.

### Static CSS files

Just like regular css files, you can include your stylesheet in your document. You can then use prose reader constants when needed. The only drawback is that you cannot target a specific reader instance since you cannot use the ID in the selectors.

If you are making an enhancer, you can add a specific attribute to the reader instance and use it as static selector as well.

This way you can also export some static css assets from your package.

Whenever you target `[data-my-enhancer]` in your css files, you can be sure they will be applied to only the readers with your enhancer plugged in.

```typescript
// Inside your enhancer
const reader = next(options)

reader.context
  .watch(`rootElement`)
  .pipe(
    // the container is only known once the reader is mounted
    filter(isDefined),
    switchMap(
      (container) =>
        new Observable(() => {
          container.setAttribute("data-my-enhancer", "true")

          // the container outlives the reader, so remove what you set on it
          return () => container.removeAttribute("data-my-enhancer")
        }),
    ),
    takeUntil(reader.$.destroy$),
  )
  .subscribe()
```

:::caution
If your CSS is small and you want to make it convenient for the user of your enhancer, consider the javascript approach instead.
:::

### Javascript

#### Targeting Reader selectors

Using javascript to add your style is the only way you can target a reader instance style specifically. When you make an enhancer, you should make sure to target the reader instance you are attached to and avoid injecting your style for all readers on the page.

The reader instance exposes a convenient method to inject your CSS in a safe way.

```typescript
// `\${id}` is escaped: `injectScopedCSS` replaces it, not JavaScript.
const style = `
[data-prose-reader-container="\${id}"] {
  background-color: red;
}
`

// or even better
// import style from "./style.css?inline"

const removeStyle = reader.utils.injectScopedCSS(
  document,
  "my-super-enhancer",
  style,
)

// Later, when reader instance is destroyed
removeStyle()
```

This adds a `<style>` element like this one to the document:

```html
<style id="my-super-enhancer-eb75a4ed-6be2-487b-81b3-d8c22bd8668f">
  [data-prose-reader-container="eb75a4ed-6be2-487b-81b3-d8c22bd8668f"] {
    background-color: red;
  }
</style>
```

There are several things happening:

* Your style has a unique name based on your scope and the reader instance. This avoid clashing between `<style>` elements
* Your style is targeting a specific reader instance ID so your style will only apply to the reader it's being injected into

`${id}` is a placeholder that `injectScopedCSS` replaces with the reader id. Only its first occurrence is replaced, so use it once per style. Keep the value quoted: the id is a UUID, and one that starts with a digit is not a valid unquoted attribute value.

:::caution
You may have noticed the drawback here, the style content is actually part of your javascript file. It adds up to the bundle size. This is not a problem if your style is not huge but you may consider other approaches if your enhancer adds a ton of style.
:::
