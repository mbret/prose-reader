# Renderers

A renderer displays the document of one spine item: a chapter in a frame, a PDF page, the page of an audio track. The reader creates one for each item, from the `getRenderer` option. An item it gets no renderer for is displayed by the html renderer that `createReader` comes with. The [PDF](../enhancers/pdf.md) and [audio](../enhancers/audio.md) enhancers bring their own for their items.

## Choosing a renderer

`getRenderer` receives each spine item, and returns a function that creates its renderer, or `undefined` to leave the item to the default one.

```typescript
const reader = createReader({
  manifest,
  getRenderer: (item) =>
    item.mediaType?.startsWith("image/")
      ? (params) => new ImageRenderer(params)
      : undefined,
})
```

An enhancer that brings a renderer keeps the one its options give. It only provides its own for the items they leave to the default, as the PDF and audio enhancers do.

```typescript
const reader = next({
  ...options,
  getRenderer: (item) =>
    options.getRenderer?.(item) ??
    (isMyKindOfItem(item) ? (params) => new MyRenderer(params) : undefined),
})
```

## Writing a renderer

A renderer extends `DocumentRenderer`, which runs the lifecycle of its document: it loads and unloads the document when the reader asks, one document at a time, and runs the document [hooks](hooks.md) around each step. The renderer implements the steps.

| Method | What it does |
| --- | --- |
| `onCreateDocument()` | Creates the element that holds the document, and emits it. Do not attach it to the dom yet. |
| `onLoadDocument()` | Loads the document, and attaches it with `attach()` once it is ready to be in the dom. The document is loaded once the observable emits or completes, and the `item.onDocumentLoad` hooks have run. An error fails the load. |
| `onLayout(params)` | Lays the document out for the viewport's page size, and emits its size. The item's width is rounded up to whole pages. `undefined` keeps the size of the last layout at the same page size, or one page. |
| `onUnload()` | Releases what the document holds, such as object urls or render tasks. Synchronous. |
| `onRenderHeadless()` | Emits the item's document, built without displaying it, for [renderHeadless()](../core-api/reader/renderheadless.md), or `undefined` when the item has none. |
| `getDocumentFrame()` | The frame the document is in, when there is one. Enhancers reach the document through it. |

It can also override the `renditionLayout`, `writingMode` and `readingDirection` getters when it knows them from its document. The spine item is `this.item`, its resource is fetched with `this.resourcesHandler`, and the reader's `this.context`, `this.settings` and `this.viewport` are at hand.

### The document container

The element `onCreateDocument()` emits is the renderer's `documentContainer` until the document is released. `DocumentRenderer` looks after it:

* It marks it with the `prose-reader-document-container` class and runs the `item.onDocumentCreated` hooks on it, then calls `onLoadDocument()`.
* When the document is released, because it is unloaded, its load fails or the reader is destroyed, it runs the `item.onDocumentUnload` hooks on it, then `onUnload()`. The container is still the `documentContainer`, and still attached if it was, while they run. Then it removes the container from the dom.

A renderer attaches the container once its document is ready, and never removes it itself. `onCreateDocument()` is only called once the previous document, if any, has been released.

### Example

Shows an image as a page of its own, without a frame. `onUnload()` finds the image it releases in `documentContainer`.

```typescript
import {
  DocumentRenderer,
  isHtmlTagElement,
  setStylePropertyIfChanged,
} from "@prose-reader/core"
import { EMPTY, from, of, switchMap } from "rxjs"

class ImageRenderer extends DocumentRenderer {
  onCreateDocument() {
    const image = this.containerElement.ownerDocument.createElement("img")

    image.style.objectFit = "contain"

    return of(image)
  }

  onLoadDocument() {
    const image = this.documentContainer

    if (!isHtmlTagElement(image, "img")) return EMPTY

    return from(this.resourcesHandler.fetchResource()).pipe(
      switchMap((resource) => {
        if (!(resource instanceof Response)) throw new Error("no image")

        return from(resource.blob())
      }),
      switchMap((blob) => {
        image.src = URL.createObjectURL(blob)
        this.attach()

        return from(image.decode())
      }),
    )
  }

  onLayout() {
    const { width, height } = this.viewport.pageSize
    const image = this.documentContainer

    if (image) {
      setStylePropertyIfChanged(image.style, "width", `${width}px`)
      setStylePropertyIfChanged(image.style, "height", `${height}px`)
    }

    return of({ width, height })
  }

  onUnload() {
    const image = this.documentContainer

    if (isHtmlTagElement(image, "img") && image.src.startsWith("blob:")) {
      URL.revokeObjectURL(image.src)
    }
  }

  onRenderHeadless() {
    return of(undefined)
  }

  getDocumentFrame() {
    return undefined
  }

  get renditionLayout(): "pre-paginated" {
    return "pre-paginated"
  }
}
```
