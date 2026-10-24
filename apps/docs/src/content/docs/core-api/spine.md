---
title: "reader.spine"
description: "The reader.spine reference: whether the pages describe the latest layout requested."
sidebar:
  label: ".spine"
---

The reference for `reader.spine`, the spine items laid out one after the other.

## Layout

### `.isLayoutCurrent$` { #islayoutcurrentusd }

```typescript
Observable<boolean>
```

Whether the pages describe the latest layout requested. Replays the current
value on subscription, then emits each time it changes.

It turns `false` the moment a layout is requested, before anything is done for
it:

- by `reader.layout()`, and what calls it, such as a resize or a setting that
  moves the pages;
- by a spine item that finishes loading, fails to load or finishes unloading.

It turns `true` once the pages of the latest request are published, before
anything else hears of them. A newer request cancels everything still running
for older ones, so the pages that make the layout current are the ones it asked
for. It is `false` until the first pages are published.

Read it before you use where a page is: while it is `false`, the pages describe
the layout before the request. A spine item's place in the spine does not wait
for them: it is replaced once the items are laid out. Neither does a spine
item's `isDirty`: a layout clears it as soon as it lays that item out, long
before the pages are computed again. For the latest navigation with whether it
holds on this layout, read
[`reader.navigation.navigationAgainstCurrentLayout$`](/core-api/navigation#navigationagainstcurrentlayoutusd).

It completes when the reader is destroyed.

### `.isLayoutCurrent` { #islayoutcurrent }

```typescript
boolean
```

The current value of `.isLayoutCurrent$`.
