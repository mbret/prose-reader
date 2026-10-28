---
title: "reader.spine"
description: "The reader.spine reference: whether the pages describe the latest layout requested, for every spine item or for one."
sidebar:
  label: ".spine"
---

The reference for `reader.spine`, the spine items laid out one after the other.

## Layout

A spine item's place depends only on the items before it. A layout started by
an item's load changes that item and the ones after it, and leaves the ones
before it as they are, so the layout is tracked from the first item it can
change.

### `.isLayoutCurrent$` { #islayoutcurrentusd }

```typescript
Observable<boolean>
```

Whether the pages describe the latest layout requested, for every spine item.
Replays the current value on subscription, then emits each time it changes.

It turns `false` the moment a layout is requested, before anything is done for
it:

- by `reader.layout()`, and what calls it, such as a resize or a setting that
  moves the pages;
- by a spine item that finishes loading, fails to load or finishes unloading.

It turns `true` once the pages of the latest request are published, before
anything else hears of them. A newer request cancels everything still running
for older ones, so the pages that make the layout current are the ones it asked
for. It is `false` until the first pages are published.

Read it before you use where a page is: while it is `false`, the pages of the
items from `.firstItemIndexAwaitingLayout` on describe the layout before the
request. A spine item's place in the spine does not wait for them: it is
replaced once the items are laid out. Neither does a spine item's `isDirty`: a
layout clears it as soon as it lays that item out, long before the pages are
computed again. For the latest navigation with whether it holds on this layout,
read
[`reader.navigation.navigationAgainstCurrentLayout$`](/core-api/navigation#navigationagainstcurrentlayoutusd).

It completes when the reader is destroyed.

### `.isLayoutCurrent` { #islayoutcurrent }

```typescript
boolean
```

The current value of `.isLayoutCurrent$`.

### `.isLayoutCurrentFor()` { #islayoutcurrentfor }

```typescript
(spineItem: SpineItem | number) => boolean
```

Whether the pages describe a spine item, given as a `SpineItem` or by its
index, as the latest layout requested lays it out: whether it comes before
`.firstItemIndexAwaitingLayout`. Its place, its pages and what a position shows
of it are then the ones the reader shows, even while a layout of the items
after it is pending. It holds for every item while `.isLayoutCurrent` does.

### `.firstItemIndexAwaitingLayout$` { #firstitemindexawaitinglayoutusd }

```typescript
Observable<number | undefined>
```

The index of the first spine item the pages may no longer describe as the
latest layout requested lays it out: the first one a layout requested since the
pages were last published can change. The items after it can change too, and
the ones before it cannot. `undefined` while the pages describe every item, as
`.isLayoutCurrent$` says. Replays the current value on subscription, then emits
each time it changes.

It moves the moment a layout is requested, before anything is done for it:

- to `0` for `reader.layout()`, and what calls it;
- to a spine item's index when that item finishes loading, fails to load or
  finishes unloading.

A request never moves it past an earlier item still waiting. It is `0` until
the first pages are published, and completes when the reader is destroyed.

### `.firstItemIndexAwaitingLayout` { #firstitemindexawaitinglayout }

```typescript
number | undefined
```

The current value of `.firstItemIndexAwaitingLayout$`.
