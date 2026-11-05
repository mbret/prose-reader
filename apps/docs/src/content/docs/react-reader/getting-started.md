---
title: "Getting started with React Reader"
description: "Install @prose-reader/react-reader, render ReactReaderProvider with your reader and ReactReader as its view, persist the font size, spread mode and theme, and add enhancers to turn on more menus."
sidebar:
  label: "Getting Started"
---

## Installation

```bash
npm install @prose-reader/react-reader @prose-reader/core @prose-reader/shared \
  @prose-reader/cbz @prose-reader/enhancer-annotations @prose-reader/enhancer-audio \
  @prose-reader/enhancer-gallery @prose-reader/enhancer-gestures \
  @prose-reader/enhancer-refit @prose-reader/enhancer-search \
  @chakra-ui/react @emotion/react rc-slider react-icons reactjrx rxjs screenfull
```

This package only uses peerDependencies, all of them required, so don't hesitate to use the library for the rest of your app. `react` and `react-dom` (19) are your app's own.

[https://github.com/mbret/reactjrx](https://github.com/mbret/reactjrx) is specifically very useful if you use `rxjs`.

react-reader needs a reader created with the [Gestures](/enhancers/gestures) enhancer: its quick menu, bookmarks and zoom are driven by `reader.gestures`.

```typescript
import { createReader } from "@prose-reader/core"
import { gesturesEnhancer } from "@prose-reader/enhancer-gestures"

export const createAppReader = gesturesEnhancer(createReader)
```

`ReactReaderProvider` holds the reader and renders nothing itself. `ReactReader` is the view: the element the book shows in, and react-reader's menus. Render both inside your `ChakraProvider`, since react-reader reads your Chakra theme:

```tsx
import type { Manifest } from "@prose-reader/core"
import { ReactReader, ReactReaderProvider } from "@prose-reader/react-reader"
import { useMemo } from "react"
// Don't forget to import the package css
import "@prose-reader/react-reader/index.css"

const MyAppReader = ({ manifest }: { manifest: Manifest | undefined }) => {
  const createReader = useMemo(
    () => manifest && (() => createAppReader({ manifest })),
    [manifest],
  )

  return (
    <ReactReaderProvider createReader={createReader}>
      <ReactReader />
    </ReactReaderProvider>
  )
}
```

`ReactReaderProvider` creates the reader with `createReader` once `ReactReader` mounts, writes the [settings](#settings) it manages into it, and mounts it in the element of `ReactReader`. It destroys the reader when it unmounts, or when `createReader` changes.

- Memoize `createReader`: a new function creates a new reader, so an inline one creates a reader on every render.
- Return a new reader on each call: the provider calls it again for the next `ReactReader`.
- Pass `undefined` until you can create the reader, while the manifest loads for example.

Children of `ReactReader` render after the element the book shows in. To show one over the book, such as a loading screen, position it absolutely.

## Lifecycle

- Render `ReactReaderProvider` above anything that hides the view, such as an `<Activity>` or a tab, and `ReactReader` inside it. Hiding `ReactReader` keeps the reader, since its element stays in the document, and the settings your app changes meanwhile reach the reader. While hidden, the reader keeps its page, and holds its layouts and navigations until it is shown again: [My reader is hidden in a tab or an Activity](/get-started/troubleshooting-faq#my-reader-is-hidden-in-a-tab-or-an-activity). Hiding the provider destroys the reader, and showing it again creates a new one.
- When `ReactReader` unmounts, the provider destroys the reader, also when an `<Activity>` hides it first. The next `ReactReader` gets a new reader in its own element, since a reader cannot move to another element.
- Render one `ReactReader` under a provider. A second one throws.

## Using the reader

`useReader()` gives the reader to any component under `ReactReaderProvider`, such as the children of `ReactReader`, after the provider mounts it. It is `undefined` before that, and after the provider destroys it. Outside a provider, it throws:

```tsx
import { useReader } from "@prose-reader/react-reader"

const PageNumber = () => {
  const reader = useReader()
  // ...
}
```

By default, `useReader()` types the reader with the gestures enhancer only. Declare the type of the reader `createReader` returns, once in your app. `useReader()` then returns that type, with the APIs of your enhancers, and `createReader` must return it:

```typescript
import type { createAppReader } from "./createAppReader"

declare module "@prose-reader/react-reader" {
  interface Register {
    reader: ReturnType<typeof createAppReader>
  }
}
```

The declared reader needs the gestures enhancer. Without it, react-reader ignores the declaration: `useReader()` and `createReader` keep the default type. The package exports the type in use, declared or default, as `ReactReaderReader`.

## Settings

react-reader manages three of the reader's settings. The user changes each from one of its menus: the font scale from the Font size dialog, the spread mode from the Layout dialog, and the theme from the Theme dialog. The theme colors the book. react-reader's own interface follows your Chakra UI theme.

react-reader writes these settings into the reader. Keep them in your app: pass them to `ReactReaderProvider` as `settings`, in the shape `reader.settings` has, and merge what `onSettingsChange` reports into them:

```tsx
import {
  ReactReader,
  ReactReaderProvider,
  type ReactReaderSettings,
} from "@prose-reader/react-reader"

const [settings, setSettings] = useState<ReactReaderSettings>(savedSettings)

<ReactReaderProvider
  createReader={createReader}
  settings={settings}
  onSettingsChange={(changes) =>
    setSettings((old) => ({ ...old, ...changes }))
  }
>
  <ReactReader />
</ReactReaderProvider>
```

| Setting | Menu |
| --- | --- |
| `fontScale` | Font size |
| `spreadMode` | Layout |
| `theme` | Theme |

Each menu starts with a choice that leaves the setting without a value of its own: Default on the global tab, and Same as global on the tabs of the [scopes](#scopes). It names the value it stands for, such as Default (Bright). In the Font size dialog it is a checkbox: unchecking it keeps the font size shown as the tab's own, and reports it. A setting takes, in this order:

1. the value of the scope it takes its value from, when that is not the global scope: yours, or else react-reader's;
2. the global value: yours in `settings`, or else react-reader's;
3. your app's defaults, `defaultSettings`;
4. the reader's default, [`reader.settings.defaults`](/learn/settings#settingsdefaults).

`onSettingsChange(changes, from)` receives only the settings that changed. `from` is the scope the user chose the value for, or `"internal"` for a value set on the reader directly, with `reader.settings.update()`. A setting the user sets back to Default or Same as global is reported as `undefined`, so merging the changes leaves that scope without a value. Picking the value Default stands for is reported like any other pick: the user keeps it when the default changes.

A setting you give no value takes the one react-reader keeps while the provider is mounted: the one picked in a menu, or set on the reader directly. Every reader the provider creates afterwards gets it, except a value kept for the book scope. react-reader never reports `defaultSettings`, nor the value the reader was created with, which it writes over. A value set on the reader directly while you give one is reported, and the reader keeps it until the value the setting takes changes.

The provider writes these settings into the reader before it mounts the reader, so the first layout uses them. It then keeps the reader on them without creating a new reader.

The theme can follow your app's light or dark mode until the user picks one. Pass the theme for that mode in `defaultSettings`:

```tsx
const defaultSettings = useMemo(
  (): ReactReaderSettings => ({
    theme: colorMode === "dark" ? "night" : "bright",
  }),
  [colorMode],
)

<ReactReaderProvider
  createReader={createReader}
  settings={settings}
  defaultSettings={defaultSettings}
>
  <ReactReader />
</ReactReaderProvider>
```

In dark mode the Theme dialog shows Default (Night), checked until the user picks a theme. A picked theme stays when your app's mode changes, and picking Default again follows the mode.

The package exports the types of these props: `ReactReaderSettings` for the values, `ReactReaderSettingsScope` and `ReactReaderSettingsScopeReference` for the scopes below, and `ReactReaderProviderProps` and `ReactReaderProps` for every prop of `ReactReaderProvider` and `ReactReader`.

### Scopes

The menus can keep a value per scope: global, the book, or the screen (`mobile`, `tablet` or `desktop`). They show a tab per scope once you pass `settingsScopes` to the provider, and let the user pick the book's scope once you pass `onSettingsScopesChange`:

| Prop | What it is |
| --- | --- |
| `settings` | The global values. |
| `settingsByScope` | The values of the other scopes, by scope: `book`, `mobile`, `tablet` and `desktop`. |
| `settingsScopes` | For this book, the scope each setting takes its value from, such as `{ fontScale: "screen" }`. A setting it leaves out takes the global value. |
| `onSettingsScopesChange(changes)` | The scope the user picked for a setting, such as `{ fontScale: "screen" }`. Keep it and pass it back in `settingsScopes`. |

react-reader resolves the screen scope to `mobile`, `tablet` or `desktop` from the width of the window, at the `md` and `lg` breakpoints of your Chakra theme. A setting takes the value of its scope when that scope has one, and otherwise the one the global tab stands for. react-reader keeps a value picked for a scope while you give no value for that scope nor a global one: while the provider is mounted, and the book's until the provider destroys the reader. `from` is the scope of the tab the value was chosen in, as its screen for the screen scope: merge `changes` into `settings` for `"global"`, and into `settingsByScope[from]` for the other scopes.

## Toggling features

With the gestures enhancer alone, react-reader offers what the core reader supports. If you want to unlock more features you can enhance your reader with automatically supported enhancers.

For example adding the enhancer [Search](/enhancers/search) will unlock this menu:

<figure><img src="/images/react-reader-search-menu.webp" alt="The search button, highlighted in the menu of React Reader" width="193" height="82"></figure>

```typescript
import { createReader } from "@prose-reader/core"
import { gesturesEnhancer } from "@prose-reader/enhancer-gestures"
import { searchEnhancer } from "@prose-reader/enhancer-search"

export const createAppReader = searchEnhancer(gesturesEnhancer(createReader))
```

:::caution
We are detecting certain markers in the enhancers to verify whether they exist and are valid. This is assuming you don't fiddle with them. The general rule of enhancers is to allow augmentation but not alteration.
:::

### Search

See [Search](/enhancers/search) to install enhancer

### Bookmarks

See [Annotations](/enhancers/annotations) to install enhancer

* Bookmarking a page is done by tapping the top right corner of the page.

### Annotations

See [Annotations](/enhancers/annotations) to install enhancer

### Audio / Audiobooks { #audio-audiobooks }

See [Audio](/enhancers/audio) to install enhancer

### Gallery

<div class="figures"><figure><img src="/images/react-reader-gallery-ipad-pro.webp" alt="The gallery of React Reader on a tablet, with thumbnails of the pages of an EPUB" width="188" height="251"></figure> <figure><img src="/images/react-reader-gallery-iphone-se.webp" alt="The gallery of React Reader on a phone, with thumbnails of the pages of a manga" width="188" height="334"></figure></div>

See [Gallery](/enhancers/gallery) to install enhancer

### Refit

See [Refit](/enhancers/refit) to install enhancer

### CBZ & comics archives { #cbz-and-comics-archives }

See [CBZ & comics archives](/enhancers/cbz-and-comics-archives) to install enhancer

* When the current page is half of a split panorama and rotating the device would display the full spread, the reader shows a rotation hint.

