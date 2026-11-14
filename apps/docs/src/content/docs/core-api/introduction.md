---
title: "Core API"
description: "What @prose-reader/core covers, what it leaves to enhancers such as gestures, search and annotations, and when a feature belongs in the core."
sidebar:
  label: "Introduction"
---

The core package is all you need to display content into a web page. This contains all the foundations and bases you need.

At some point you will realize that you need to add things like gestures, search, annotations etc. They are not part of the core because they can be opinionated and different between reading systems. However they can be built easily upon the core. That is by design but we also provide ready to use [Enhancers](/learn/enhancers) to implement the common features.

## Design principles

We always try to add new features to the core as `enhancers` within the core package. They are transparent to the consumers but it ensures that the core is flexible enough for anyone to add features when needed and without having to contribute to the core.

You can see how we do it [here](https://github.com/mbret/prose-reader/tree/master/packages/core/src/enhancers).

When a feature is common or basic enough it may go into the core package. Otherwise we might make an enhancer package for it.

If it answers all the questions by YES, it should be in the core:

* Is it standard practice ?
* Is it likely needed by all developers ?
* Is it following strictly browser API ?


## Streams { #streams }

A stream that the reader exposes as a property, such as `reader.pagination.state$` or a spine item's `isReady$`, is the same object every time you read it.

A method that returns a stream, such as `.watch()`, builds a new stream on every call. A hook that takes the stream as a dependency, such as reactjrx's `useObserve`, subscribes again each time the stream changes. Give it the call through a factory, with its dependencies:

```tsx
const { data: isSpread } = useObserve(
  () => reader?.viewport.watch("isSpread"),
  [reader],
)
```
