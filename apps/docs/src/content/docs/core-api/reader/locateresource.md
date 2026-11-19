---
title: "reader.locateResource()"
description: "Map CFIs and spine items to page indexes, DOM nodes and ranges with reader.locateResource(): its parameters, its shallow and load modes, and the live result."
sidebar:
  label: "locateResource()"
---

Locate a given resource and give you extra information such as absolute page index, relevant nodes, offset etc. This is most useful when you want to locate resources such as CFI.

This method is live, it will return an observable that emits every time the reader layout.

```typescript
const consolidatedResource$ = reader.locateResource(resource, options)
```

## Reference

`locateResource(resource, options)`

```typescript
type CfiLocatableResource = {
  cfi: string
}

type ProseParsedCfi = {
  // This will always be set and is statically inferred from the CFI format.
  // This does not mean the range is valid.
  isCfiRange: boolean
  itemIndex: number
}

export type LocatableResource = SpineItem | CfiLocatableResource

export type ConsolidatedResource = CfiLocatableResource & ProseParsedCfi & {
  // The page of its spine item the resource is on, once it is known.
  itemPageIndex?: number
  // The page of the book the resource is on, known with itemPageIndex.
  absolutePageIndex?: number
  // The node the CFI points to, while its item is loaded.
  node: Node | null
  // The character offset at the end of the CFI, as written.
  offset?: number
  // The offset the CFI resolves to, while its item is loaded.
  startOffset?: number
  // This is the resolved range if there is one and if it's resolvable.
  // Meaning, a valid range for this book item
  range?: Range | null
}

locateResource(resource, options)
```

### Parameters

* `resource`: An object or array of objects that extends `LocatableResource`. Resources at the same cfi share one consolidation, and each comes back with its own `resource`. A spine item is located at the cfi of its start.
* `options?` :
  * `mode?:`"shallow" | "load" : Default `load`. Shallow means that the item will not be loaded if needed. Load keeps a reflowable item loaded while you are subscribed, through [`keepSpineItemLoaded()`](/core-api/reader/keepspineitemloaded), and releases its hold a second after you unsubscribe. Neither mode loads a pre-paginated item: its page indexes need no document, and its `node`, `startOffset` and `range` resolve only while it is loaded for another reason, such as being around the reading position. By using shallow you avoid loading documents excessively but you will only get the values as precise as possible with the current reader state.

### Page indexes

`itemPageIndex` and `absolutePageIndex` are given only when the reader knows them:

* A spine item, a CFI that names only its item, and a CFI of a pre-paginated item are on the first page of their item. Their page is known at once, loaded or not.
* Any other CFI of a reflowable item is on the page of the node it points to. Its page is known while its item is loaded and laid out, is not being laid out again, and the CFI resolves in it. It is `undefined` otherwise.

In the `shallow` mode, a CFI of a reflowable item that is not loaded therefore has no page. It gets one when its item loads, for example because the reader goes there, and loses it as soon as its item unloads. In the `load` mode, it has no page until its item has loaded.

The values follow the last completed layout. While a new layout of the item is pending, after a resize or a change of font size for example, they are those of the layout before it, and the resource is located again once the layout completes. A resource you locate while its item is being laid out gets its page once that layout completes. [`reader.spine.isLayoutCurrentFor()`](/core-api/spine#islayoutcurrentfor) tells whether a layout of the item is pending.

`reader.cfi.getSpineItemPageIndexFromCfi(cfi)` gives the `itemPageIndex` of one CFI by the same rules, at once. It locates and loads nothing, and returns `undefined` when the page is not known.

### Returns

```typescript
Observable<{ resource: T; meta: ConsolidatedResource }>
```

Or if you passed an array of resources

```typescript
Observable<{ resource: T; meta: ConsolidatedResource }[]>
```

An observable containing the initial resources and their consolidated metadata. It completes when the reader is destroyed.

