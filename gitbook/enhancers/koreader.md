# KOReader

This enhancer connects a reader to the KOReader ecosystem: it navigates to the
**crengine xpointers** KOReader and the KOReader-sync servers exchange, and
converts a cfi, such as the reading position, to one. The conversions themselves come from
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
reader.navigation.readingPosition$.subscribe(
  ({ cfi, percentageEstimateOfBook }) => {
    const xpointer = reader.koreader.cfiToXPointer(cfi)

    // push the xpointer and its percentage to a KOReader sync server
  },
)
```

`reader.koreader.cfiToXPointer(cfi)` is the xpointer of a cfi. Convert the
reading position as it comes, and push it the way the
[navigation guide](../learn/navigation.md#saving-it) says to save it. A cfi
naming a chapter converts at once, and one naming a place in its text needs the
chapter's document, which is loaded by the time the reading position names
that place. It returns `undefined` when it cannot convert: a place in a
chapter that is not loaded, or a cfi naming nothing in the book.

The reading position is what the
[navigation guide](../learn/navigation.md#reading-position) says, whatever the
target, xpointers included:

- On the way to an xpointer whose chapter is loading, it stands in at the
  chapter's start. Once the chapter shows the place, it is that place, final
  once the page holding it is laid out.
- When an xpointer's place cannot be found once its chapter has loaded, a stale
  one for instance, the reader goes to the chapter's first page, and that page
  is the reading position.
