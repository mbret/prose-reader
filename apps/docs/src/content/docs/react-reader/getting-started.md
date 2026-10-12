---
title: "Getting Started"
---

## Installation

```bash
npm install @prose-reader/react-reader @prose-reader/core @prose-reader/shared \
  @prose-reader/cbz @prose-reader/enhancer-annotations @prose-reader/enhancer-audio \
  @prose-reader/enhancer-gallery @prose-reader/enhancer-gestures \
  @prose-reader/enhancer-refit @prose-reader/enhancer-search \
  @chakra-ui/react @emotion/react rc-slider react-icons reactjrx rxjs screenfull
```

This package only uses peerDependencies, all of them required, so don't hesitate to use the library for the rest of your app. `react` and `react-dom` (18 or 19) are your app's own.

[https://github.com/mbret/reactjrx](https://github.com/mbret/reactjrx) is specifically very useful if you use `rxjs`.

```typescript
import { ReactReader } from "@prose-reader/react-reader"
// Don't forget to import the package css
import "@prose-reader/react-reader/index.css"

const MyAppReader = () => {
  const containerRef = useRef<HTMLDivElement | null>(null)
  // You own the creation of your reader instance
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

A reader lives for a single book, so the idiomatic React pattern is one effect that creates and mounts the reader together, with `destroy()` as its cleanup. Because `destroy()` is the true inverse of create + mount, the effect is naturally safe with strict mode re-running effects:

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

The user changes some of the reader's settings from react-reader's menus: the font size, and the spread mode in the Layout dialog. react-reader manages both the same way, as props of the component:

| Setting | Value | Change callback | Scopes | Reader setting |
| --- | --- | --- | --- | --- |
| Font size | `fontSize` | `onFontSizeChange` | `fontSizeScope`, `onFontSizeScopeChange`, `fontSizeValues` | `fontScale` |
| Spread mode | `spreadMode` | `onSpreadModeChange` | `spreadModeScope`, `onSpreadModeScopeChange`, `spreadModeValues` | `spreadMode` |

react-reader writes the value into the reader, so don't give it to your reader when you create it: it would be overwritten. Keep the value in your app, save it from the change callback and pass it back as a prop:

```tsx
<ReactReader
  reader={reader}
  fontSize={saved.fontSize}
  onFontSizeChange={(_scope, fontSize) => save({ fontSize })}
  spreadMode={saved.spreadMode}
  onSpreadModeChange={(_scope, spreadMode) => save({ spreadMode })}
/>
```

The change callback receives the scope whose value the user changed, or `"internal"` for a value set on the reader directly. Without the value prop, react-reader keeps its own copy for as long as it is mounted, starting from the value the reader was created with. Its menus offer to pick a scope only once you pass the scope props.

## Toggling features

By default, the reader will use the bare core reader. If you want to unlock more features you can enhance your reader with automatically supported enhancers.

For example adding the enhancer [Search](/react-reader/getting-started#search) will unlock this menu:

<figure><img src="/images/react-reader-search-menu.png" alt=""></figure>

```typescript
import { searchEnhancer } from "@prose-reader/enhancer-search"
import { createReader } from "@prose-reader/core"

export const createAppReader = searchEnhancer(createReader)
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

### Audio / Audiobooks

See [Audio](/enhancers/audio) to install enhancer

### Gallery

<div class="figures"><figure><img src="/images/react-reader-gallery-ipad-pro.png" alt="" width="188"></figure> <figure><img src="/images/react-reader-gallery-iphone-se.png" alt="" width="188"></figure></div>

See [Gallery](/enhancers/gallery) to install enhancer

### Refit

See [Refit](/enhancers/refit) to install enhancer

### CBZ & comics archives

See [CBZ & comics archives](/enhancers/cbz-and-comics-archives) to install enhancer

* When the current page is half of a split panorama and rotating the device would display the full spread, the reader shows a rotation hint.

