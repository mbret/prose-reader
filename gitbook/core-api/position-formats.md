# Position formats

A position format adapts an external string to a DOM position. Core loads the named spine item, resolves the target, and converts it to a canonical EPUB CFI. Registration is synchronous and should happen before `mount`.

This example registers a KOReader XPointer format, written in [Writing a format](#writing-a-format) below:

```typescript
import { createReader } from "@prose-reader/core"
import { koreaderPositionFormat } from "./koreaderPositionFormat"

const reader = createReader({
  manifest,
  position: { format: "koreader", value: savedXPointer },
})
const unregister = reader.positions.register(koreaderPositionFormat)
reader.pagination.state$.subscribe((state) => {
  if (!state.isSettled) return

  savePositions(state.begin.positions) // cfi and koreader refer to the same page-start DOM position
})
reader.mount(container)

reader.navigation.goTo({ format: "koreader", value: anotherXPointer }, { animate: false })
```

`reader.positions.get(name)` returns a registered format or `undefined`. `list()` returns a snapshot of the formats. `register(format)` returns an idempotent unregister function. Names must be nonempty and unique: registering the format already registered under its name again is a no-op that returns the same unregister function, while another format under a registered name throws. The built-in `cfi` and `url` formats cannot be replaced or unregistered. Registering or unregistering after mount affects the next pagination update.

## Writing a format

Import the DOM-specific types from `@prose-reader/shared/positions` (also re-exported by core). This type-only subpath keeps shared's root usable in Node-only projects without DOM libraries.

A format is usually a thin adapter over a library that already understands the external value. Here, [`@prose-reader/koreader`](../koreader/README.md) parses, resolves and generates the XPointers:

```typescript
import type { PositionFormat } from "@prose-reader/shared/positions"
import { parseXPointer, resolveXPointer, generateXPointer } from "@prose-reader/koreader"

export const koreaderPositionFormat: PositionFormat = {
  name: "koreader",
  spineItemIndexOf: value => parseXPointer(value)?.spineItemIndex,
  resolve: (value, { document }) => resolveXPointer(value, document),
  generate: (position, { spineItem }) => generateXPointer(position, spineItem.index),
}
```

The complete contract is:

```typescript
type DomPosition = { node: Node; offset?: number }
type PositionTarget = { format: string; value: string }
type PositionFormatContext = {
  spineItem: Manifest["spineItems"][number]
  document: Document
}
type PositionFormat = {
  name: string
  spineItemIndexOf(value: string): number | undefined
  resolve(value: string, context: PositionFormatContext): DomPosition | undefined
  generate(position: DomPosition, context: PositionFormatContext): string | undefined
}
```

`spineItemIndexOf` returns a zero-based manifest spine index without loading a document. Return `undefined` for values the format does not recognize. Text offsets use UTF-16 code units; element offsets describe a child boundary.

1. `resolve` receives the loaded document of the item named by `spineItemIndexOf`. Functions must be synchronous and pure; a later request or reload may call them again. Once a request is converted, its restoration uses CFI and does not call that format again.
2. A target stays pending while its item is not ready, and is consumed once it is. Returning `undefined` from `resolve` means the named item's start. An item rendered without a DOM document (an image, an audio track) also falls back to its start, without calling `resolve`.
3. `generate` receives the same page-start visible node and offset used for the CFI, in its loaded document. Returning `undefined` omits that key. Pages without a visible DOM node carry only a root CFI.
4. Register synchronously during enhancer construction, before `mount`. An unknown format or invalid spine index warns and falls back to the first spine item.
5. Formats receive only the manifest item and document. Core handles readiness, navigation locks, and relayout.

## Built-in formats

| Name | Input | Pagination output |
| --- | --- | --- |
| `cfi` | EPUB CFI, including an item-root CFI | Canonical CFI in `begin.positions.cfi` / `end.positions.cfi` |
| `url` | Absolute spine-item URL, optionally with an element ID fragment | Omitted |

`goToCfi(value, options)` is shorthand for `goTo({ format: "cfi", value }, options)`. `goToUrl(url)` is shorthand for URL navigation with animation disabled. Direct `navigate({ cfi })` and `navigate({ url })` also feed the format pipeline. `navigate({ spineItem })` remains a separate item navigation.

## Saving positions

`begin.positions` and `end.positions` represent the starts of the first and last visible pages. Each exposes one canonical CFI alongside any registered external representations. They are not added to individual `spine.pages` entries.

```typescript
// Exported by @prose-reader/core
type Positions = {
  cfi: string | undefined
  [format: string]: string | undefined
}
```

`positions.cfi` is an explicitly declared property, so TypeScript supports dot access even with `noPropertyAccessFromIndexSignature`. It is `undefined` before pagination is available, and typed as present on the edges of a settled result. Custom format names are registered at runtime: use `positions[formatName]` and handle `undefined`. The type does not guarantee that a custom format has been registered.

Pagination can emit temporary item-start positions during loading or navigation. Save only results whose `isSettled` is true: a pending target's item is not ready, so a result cannot settle before the target is consumed and the visible page's positions are generated from its loaded document. See [Saving reading progress](../learn/pagination.md#saving-reading-progress).

CFI remains core's canonical anchor because it can express DOM positions more precisely than some external formats. A pending target is consumed once: its external value is discarded and its CFI retained. Annotations, restoration, and the existing CFI generation/resolution hooks continue to use CFI, including CBZ virtual-spine mapping.
