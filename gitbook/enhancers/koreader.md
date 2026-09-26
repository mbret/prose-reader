# KOReader

This enhancer connects a reader to the KOReader ecosystem: it navigates to the
**crengine xpointers** KOReader and the KOReader-sync servers exchange, and
reports the reading position as one. The conversions themselves come from
[`@prose-reader/koreader`](../koreader/README.md); this enhancer is what ties
them to a live reader.

## Getting Started

```bash
npm install @prose-reader/enhancer-koreader @prose-reader/core rxjs
```

```typescript
import { createReader } from "@prose-reader/core"
import { koreaderEnhancer } from "@prose-reader/enhancer-koreader"

const createAppReader = koreaderEnhancer(createReader)

const reader = createAppReader({ manifest })
```

## Going to an xpointer

```typescript
reader.navigation.goToXPointer("/body/DocFragment[14]/body/div/p[3]/text().42")

// or, like any other target
reader.navigation.navigate({
  target: { type: "xpointer", value: "/body/DocFragment[14]/body/div/p[3]/text().42" },
})
```

The pointer names its spine item, which the reader goes to at once, and a
place in its document, which it finds once that document is loaded, even when
the chapter was not loaded when the navigation started. A pointer outside the
book is ignored. `goToXPointer` never animates.

## The reading position as an xpointer

```typescript
reader.navigation.readingPositionXPointer$.subscribe((xpointer) => {
  // push it to a KOReader sync server
})
```

`readingPositionXPointer$` is the `cfi` of `reader.navigation.readingPosition$`
as an xpointer, for a sync client to push. It never emits a pointer less precise than
the position the reader is on, since pushing one would overwrite a better
position on the server:

- A reading position is converted once it is final, once the reader has found
  where a navigation took it, rather than the chapter start standing in while
  the chapter loads.
- On its way to an xpointer, it emits that xpointer at once. On its way
  anywhere else, the last pointer stands until the reading position is final.
- When an xpointer's place cannot be found once its chapter has loaded, a stale
  one for instance, the reader goes to the chapter's first page, and that page
  is what it emits.

It replays the current pointer on subscription.
