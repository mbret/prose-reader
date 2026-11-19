---
title: "Annotations enhancer"
description: "Install @prose-reader/enhancer-annotations, draw highlights from your annotations, create annotations with createAnnotation and store them as they are, find the pages that can hold one with candidates$, and avoid the root CFI you get on a blank page."
sidebar:
  label: "Annotations"
---

## Getting Started

```bash
npm install @prose-reader/enhancer-annotations @prose-reader/core @prose-reader/shared rxjs
```

All three are peer dependencies: the enhancer runs against the reader your app
creates, so it shares that reader's copies rather than bringing its own.

## Highlights

Give the enhancer your annotations as an observable, and it draws them:

```ts
import { createReader } from "@prose-reader/core"
import {
  type Annotation,
  annotationsEnhancer,
} from "@prose-reader/enhancer-annotations"
import { BehaviorSubject } from "rxjs"

const annotations$ = new BehaviorSubject<Annotation[]>([])

const reader = annotationsEnhancer(createReader)({
  manifest,
  annotations: { annotations$ },
})
```

Each list replaces the one before. The enhancer draws a highlight for each
annotation whose CFI is a range, in the spine items whose document is loaded:

* in its `highlightColor`, or yellow when it has none;
* with a note icon when it has `notes`;
* with a red dashed border when it is the first annotation of the list that
  is `selected`.

When an annotation leaves the list, its highlight goes. To change an
annotation, give it as a new object: the enhancer ignores a list that holds
the same objects as the one before. Its highlight is then drawn again with the
new data.

`reader.annotations.highlightTap$` emits `{ event, highlight }` when the user
taps a highlight. `highlight` is a copy of its annotation that adds its
`itemIndex`, so match it to yours by `id`.

## Creating an annotation

`reader.annotations.createAnnotation()` gives a new annotation its `id` and its `cfi`. Pass it one of two things:

- a selection and the index of its spine item, as `reader.selection.getSelection()` gives them, for a highlight;
- the absolute index of a page, for a bookmark.

```typescript
const currentSelection = reader.selection.getSelection()

if (currentSelection) {
  const highlight = reader.annotations.createAnnotation({
    itemIndex: currentSelection.itemIndex,
    selection: currentSelection.selection,
  })

  if (highlight) {
    saveAnnotation({ ...highlight, highlightColor: "yellow", notes: "" })
  }
}

const bookmark = reader.annotations.createAnnotation({ absolutePageIndex })
```

It returns `{ id, cfi }`: two strings and nothing else. Add the other fields of your annotation to it, such as `highlightColor` and `notes`, and store the result as it is: in IndexedDB, for example.

- For a selection, the CFI is the range of the selection.
- For a page, the CFI points to the first visible node of the page, or to the root of its spine item when the page has none: see [Blank pages and annotations](#blank-pages-and-annotations).
- It returns `undefined` when the reader has no such spine item or page, or when the selection holds no range.

Do not store a page index with an annotation: its page changes with the layout and the device. See [Danger of persisting weak references](/learn/annotations#danger-of-persisting-weak-references).

## Blank pages and annotations

Sometimes you may end up with blank pages. Some of the scenarios that lead to a blank page are:

* Document configured to show a blank page before or after a specific page (by design)
* Document spreading on more than one page but the DOM does not cover all pages

This situation is unfortunate but sometimes by design as well. Trying to annotate a page on which it's impossible to create a CFI from (other than a root CFI) will make it impossible to derive the correct page for it later.

We provide a `.candidates$` observable which you can observe to know which page is a good candidate for annotation or not. A good candidate is defined as such:

* Page from a pre-paginated document (there can be only one page anyway)
* Page with a visible DOM node (meaning you can target it with a CFI)

pre-paginated documents are by design always on one page so we don't check whether they have a visible node.

`candidates$` emits one boolean per page the reader has published, by absolute page index, each time the reader publishes its pages. Until the reader has published its first pages, it emits an empty array. It gives its latest value to a new subscriber at once, so it can be read with `withLatestFrom`.

## Troubleshoots

### Annotation CFI is empty (root CFI)

If you get a root CFI when trying to annotate a page, it is likely because we were unable to find a node to create a CFI from. This can happen when trying to annotate a blank page. Try to filter out such pages.
