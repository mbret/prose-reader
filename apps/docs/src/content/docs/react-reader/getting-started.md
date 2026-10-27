---
title: "Getting started with React Reader"
description: "Install @prose-reader/react-reader, render ReactReader with your reader instance, persist font size, spread mode and theme, and add enhancers to turn on more menus."
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

react-reader manages some of the reader's settings as props of the component. The user changes two of them from its menus: the font size, and the spread mode in the Layout dialog. The theme has no menu: your app sets it, for example to follow its own light or dark mode. It colors the book, not react-reader's own interface, which follows its Chakra UI theme.

| Setting | Value | Change callback | Scopes | Reader setting |
| --- | --- | --- | --- | --- |
| Font size | `fontSize` | `onFontSizeChange` | `fontSizeScope`, `onFontSizeScopeChange`, `fontSizeValues` | `fontScale` |
| Spread mode | `spreadMode` | `onSpreadModeChange` | `spreadModeScope`, `onSpreadModeScopeChange`, `spreadModeValues` | `spreadMode` |
| Theme | `theme` | `onThemeChange` | none | `theme` |

Keep the value in your app, save it from the change callback and pass it back as a prop. A theme that follows the app's color mode has nothing to save:

```tsx
<ReactReader
  reader={reader}
  fontSize={saved.fontSize}
  onFontSizeChange={(_scope, fontSize) => save({ fontSize })}
  spreadMode={saved.spreadMode}
  onSpreadModeChange={(_scope, spreadMode) => save({ spreadMode })}
  theme={colorMode === "dark" ? "night" : "bright"}
>
  <div ref={containerRef} style={{ height: "100%", width: "100%" }} />
</ReactReader>
```

The change callback receives the scope whose value the user changed, or `"internal"` for a value that comes from the reader: one set on it directly or, without the value prop, the one it was created with when that is not the default. `onThemeChange` only receives `"internal"`, since react-reader has no theme menu. Without the value prop, react-reader keeps its own copy for as long as it is mounted, starting from the value the reader was created with. Its menus offer to pick a scope only once you pass the scope props.

react-reader writes the values into the reader it gets through the `reader` prop. It writes the font size and the spread mode once they have stayed 200 ms, so a slider dragged across sizes writes once, and the theme as soon as it changes.

Create your reader with the same values, so it starts on them rather than switching to them: a reader created without your theme shows `bright` until react-reader writes yours. Read the values when you create the reader, without making them a reason to create it again, since react-reader keeps the reader on them afterwards. In `useReaderInstance`, a ref does that:

```typescript
const settingsRef = useLiveRef({
  fontScale: saved.fontSize,
  spreadMode: saved.spreadMode,
  theme: colorMode === "dark" ? "night" : "bright",
})

useEffect(() => {
  // ...
  const instance = createAppReader({ manifest, ...settingsRef.current })
  // ...
}, [manifest, containerRef, settingsRef])
```

`useLiveRef` comes from [reactjrx](https://github.com/mbret/reactjrx). A setting left `undefined`, as before anything is saved, keeps its default.

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

