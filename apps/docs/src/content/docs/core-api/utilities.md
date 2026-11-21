---
title: "Core utilities"
description: "@prose-reader/core helpers: observeBookBoundaryReached() tells when the user reaches the start or end of the book, holding the end back while items load, and getNextNodeInDocumentOrder() steps through a document's nodes."
sidebar:
  label: "utilities"
---

#### `observeBookBoundaryReached(reader)` { #observebookboundaryreached-reader }

Product-level "user reached the start/end of the book" signal with last-item readiness so `"end"` events are withheld while the spine is still growing through lazy loads. `"start"` passes through immediately.

```typescript
observeBookBoundaryReached(reader)
```

#### `getNextNodeInDocumentOrder(node, { skipDescendants })`

The node after `node` in document order: its first child, or, with `skipDescendants` or when it has none, the next sibling of `node` or of its closest ancestor that has one. It never returns an ancestor of `node`, and returns `null` past the end of the document. An enhancer that walks the nodes of a range steps with it.

```typescript
let node: Node | null = range.startContainer

while (node && node !== nodeAfterRange) {
  // read `node`
  node = getNextNodeInDocumentOrder(node, { skipDescendants: false })
}
```
