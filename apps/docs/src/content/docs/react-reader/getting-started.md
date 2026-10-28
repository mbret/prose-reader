---
title: "Getting started with React Reader"
description: "Install @prose-reader/react-reader, render ReactReader with your reader instance, persist font size and spread mode, and add enhancers to turn on more menus."
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

```tsx
import type { Manifest } from "@prose-reader/core"
import { ReactReader } from "@prose-reader/react-reader"
import { useRef } from "react"
// Don't forget to import the package css
import "@prose-reader/react-reader/index.css"

const MyAppReader = ({ manifest }: { manifest: Manifest | undefined }) => {
  const containerRef = useRef<HTMLDivElement | null>(null)
  // You own the creation of your reader instance,
  // see `useReaderInstance` below
  const readerInstance = useReaderInstance(manifest, containerRef)
  
  // Then we handle the rendering
  return (
    <ReactReader
      reader={readerInstance}
    >
      <div ref={containerRef} style={{ height: "100%", width: "100%" }} />
    </ReactReader>
  )
}
```

A reader lives for a single book, so the idiomatic React pattern is one effect that creates and mounts the reader together, with `destroy()` as its cleanup. `destroy()` removes the reader's elements, classes, attributes, styles and listeners from the container, so the effect is safe with strict mode re-running effects:

```typescript
import { useEffect, useState, type RefObject } from "react"
import type { Manifest } from "@prose-reader/core"

const useReaderInstance = (
  manifest: Manifest | undefined,
  containerRef: RefObject<HTMLElement | null>,
) => {
  const [reader, setReader] = useState<ReturnType<typeof createAppReader>>()

  useEffect(() => {
    const containerElement = containerRef.current

    if (!manifest || !containerElement) return

    const instance = createAppReader({ manifest })

    instance.mount(containerElement)
    setReader(instance)

    return () => {
      instance.destroy()
      setReader(undefined)
    }
  }, [manifest, containerRef])

  return reader
}
```

## Settings

The user changes some of the reader's settings from react-reader's menus: the font scale from the font size menu, and the spread mode from the Layout dialog. react-reader writes them into the reader, so don't give them to your reader when you create it: they would be overwritten. Keep them in your app instead. Pass them as `settings`, in the shape `reader.settings` has, and merge what `onSettingsChange` reports into them:

```tsx
import { ReactReader, type ReactReaderSettings } from "@prose-reader/react-reader"

const [settings, setSettings] = useState<ReactReaderSettings>(savedSettings)

<ReactReader
  reader={reader}
  settings={settings}
  onSettingsChange={(changes) =>
    setSettings((old) => ({ ...old, ...changes }))
  }
>
  <div ref={containerRef} style={{ height: "100%", width: "100%" }} />
</ReactReader>
```

| Setting | Menu |
| --- | --- |
| `fontScale` | Font size |
| `spreadMode` | Layout |

`onSettingsChange(changes, from)` receives only the settings that changed. `from` is the scope the user chose the value for, or `"internal"` for a value set on the reader directly, such as by a pinch.

A setting you give no value keeps react-reader's own, for as long as it is mounted, starting from the value the reader was created with. A change in the menus still reaches `onSettingsChange`.

The package exports the types of these props: `ReactReaderSettings` for the values, `ReactReaderSettingsScope` and `ReactReaderSettingsScopeReference` for the scopes below, and `ReactReaderProps` for every prop of `ReactReader`.

### Scopes

The menus can keep a value per scope: global, the book, or the screen (`mobile`, `tablet` or `desktop`). They show a tab per scope once you pass `settingsScopes`, and let the user pick the book's scope once you pass `onSettingsScopesChange`:

| Prop | What it is |
| --- | --- |
| `settings` | The global values. |
| `settingsByScope` | The values of the other scopes, by scope: `book`, `mobile`, `tablet` and `desktop`. |
| `settingsScopes` | For this book, the scope each setting takes its value from, such as `{ fontScale: "book" }`. A setting it leaves out takes the global value. |
| `onSettingsScopesChange(changes)` | The scope the user picked for a setting, such as `{ fontScale: "screen" }`. Pass it back in `settingsScopes` as the screen you are on, such as `"tablet"`. |

A setting takes the value of its scope when that scope has one, and the global value otherwise. `from` tells which scope a change belongs to: merge `changes` into `settings` for `"global"`, and into `settingsByScope[from]` for the other scopes.

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

