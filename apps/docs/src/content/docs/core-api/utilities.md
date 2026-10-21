---
title: "Core utilities"
description: "A @prose-reader/core helper: observeBookBoundaryReached() tells when the user reaches the start or end of the book, holding the end back while items load."
sidebar:
  label: "utilities"
---

#### `observeBookBoundaryReached(reader)` { #observebookboundaryreached-reader }

Product-level "user reached the start/end of the book" signal with last-item readiness so `"end"` events are withheld while the spine is still growing through lazy loads. `"start"` passes through immediately.

```typescript
observeBookBoundaryReached(reader)
```
