---
title: "reader.spine"
description: "The reader.spine reference: its element, and which spine items the pages describe as the latest layout requested lays them out."
sidebar:
  label: ".spine"
---

The reference for `reader.spine`, the spine items laid out one after the other.

## State

### `.value` { #value }

```typescript
{
  element: HTMLElement | undefined
  firstItemIndexAwaitingLayout: number | undefined
}
```

The spine's state, read synchronously.

| Field | Meaning |
| --- | --- |
| `element` | The element holding the spine items, created when the reader is mounted. `undefined` until then |
| `firstItemIndexAwaitingLayout` | The index of the first spine item the pages may no longer describe as the latest layout requested lays it out, see [Layout](#layout). `undefined` while the pages describe every item |

### `.state$` { #stateusd }

```typescript
Observable<typeof reader.spine.value>
```

The state as soon as you subscribe, then each time it changes. To react to one
field, watch it with `.watch()`. `reader.spine` is itself an observable of the
same states: subscribing to it is subscribing to `.state$`. Both complete when
the reader is destroyed.

### `.watch()` { #watch }

```typescript
type SpineState = typeof reader.spine.value

watch<K extends keyof SpineState>(key: K): Observable<SpineState[K]>
watch<K extends keyof SpineState>(keys: K[]): Observable<Pick<SpineState, K>>
```

One field, or several, as soon as you subscribe, then whenever they change.

```typescript
reader.spine
  .watch("firstItemIndexAwaitingLayout")
  .subscribe((firstItemIndexAwaitingLayout) => {
    // undefined once the pages describe every item again
  })
```

## Layout

A spine item's place depends only on the items before it. A layout started by
an item's load changes that item and the ones after it, and leaves the ones
before it as they are, so the spine tracks the layout from the first item it
can change: its state's `firstItemIndexAwaitingLayout`. The items after that one
can change too, and the ones before it cannot.

It moves the moment a layout is requested, before anything is done for it:

- to `0` for `reader.layout()`, and what calls it, such as a resize or a
  setting that moves the pages;
- to a spine item's index when that item finishes loading, fails to load or
  finishes unloading.

A request never moves it past an earlier item still waiting. It turns
`undefined` once the pages of the latest request are published: the spine
updates its state before the pages reach anything else. A newer request
cancels everything still running for older ones, so the pages published then
are the ones it asked for. It is `0` until the first pages are published.

Read it before you use where a page is: while it is a number, the pages of that
item and of the ones after it describe the layout before the request. A spine
item's place in the spine does not wait for them: it is replaced once the items
are laid out. Neither does a spine item's `isDirty`: a layout clears it as soon
as it lays that item out, long before the pages are computed again. For the
latest navigation with whether it holds on this layout, read
[`reader.navigation.navigationAgainstCurrentLayout$`](/core-api/navigation#navigationagainstcurrentlayoutusd).

### `.isLayoutCurrentFor()` { #islayoutcurrentfor }

```typescript
(spineItem: SpineItem | number) => boolean
```

Whether the pages describe a spine item, given as a `SpineItem` or by its
index, as the latest layout requested lays it out: whether it comes before the
state's `firstItemIndexAwaitingLayout`, read when you call it. Its place, its
pages and what a position shows of it are then the ones the reader shows, even
while a layout of the items after it is pending.
