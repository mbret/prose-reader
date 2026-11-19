---
title: "Annotations enhancer"
description: "Install @prose-reader/enhancer-annotations, create annotations you can store as they are with createAnnotation, find the pages that can hold one with candidates$, and avoid the root CFI you get on a blank page."
sidebar:
  label: "Annotations"
---

## Getting Started

```bash
npm install @prose-reader/enhancer-annotations @prose-reader/core @prose-reader/shared rxjs
```

All three are peer dependencies: the enhancer runs against the reader your app
creates, so it shares that reader's copies rather than bringing its own.

## Creating an annotation

`reader.annotations.createAnnotation()` gives a new annotation its `id` and its `cfi`. Pass it a selection with the index of its spine item, or the absolute index of a page:

```typescript
// A highlight of what the user selected
const selection = reader.selection.getSelection()

if (selection) {
  const annotation = reader.annotations.createAnnotation({
    itemIndex: selection.itemIndex,
    selection: selection.selection,
  })

  if (annotation) {
    saveAnnotation({ ...annotation, highlightColor: "yellow", notes: "" })
  }
}

// A bookmark of a page
const bookmark = reader.annotations.createAnnotation({ absolutePageIndex })
```

It returns `{ id, cfi }` and nothing else, whatever else the parameter holds, so you can store the result as it is, in IndexedDB for example. Add the other fields of your annotation to it, such as `highlightColor` and `notes`.

- For a selection, the CFI is the range of the selection.
- For a page, the CFI is the first visible node of the page, or the root of its spine item when the page has none: see [Blank pages and annotations](#blank-pages-and-annotations).
- It returns `undefined` when the reader has no such spine item or page.

The result holds no page index, because the page of an annotation changes with the layout: see [Danger of persisting weak references](/learn/annotations#danger-of-persisting-weak-references).

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
