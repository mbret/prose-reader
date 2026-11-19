---
title: "Annotations enhancer"
description: "Install @prose-reader/enhancer-annotations, show your annotations as highlights, find the pages that can hold an annotation with candidates$, and avoid the root CFI you get on a blank page."
sidebar:
  label: "Annotations"
---

## Getting Started

```bash
npm install @prose-reader/enhancer-annotations @prose-reader/core @prose-reader/shared rxjs
```

All three are peer dependencies: the enhancer runs against the reader your app
creates, so it shares that reader's copies rather than bringing its own.

## Showing highlights

Give the enhancer your annotations as an observable, and emit a new array each
time they change:

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

// The user removed an annotation.
annotations$.next(
  annotations$.value.filter((annotation) => annotation.id !== removedId),
)
```

The enhancer draws a highlight for each annotation whose CFI is a range, over
the text that range covers, while the document of its spine item is loaded:

* in its `highlightColor`, or yellow when it has none, with a note icon when it
  has `notes`;
* with a dashed border when it is `selected`.

It follows the array by `id`. When the entry of an annotation changes, the
enhancer draws its highlight again. When an annotation leaves the array, its
highlight goes at once.

`reader.annotations.highlightTap$` emits each tap on a highlight, with its
annotation. Observe it only to react to taps: the enhancer draws the highlights
without it.

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
