---
title: "reader.keepSpineItemLoaded()"
description: "Keep the document of a spine item loaded in the reader wherever the reading position goes, until you release it, as the gallery enhancer does to copy a page."
sidebar:
  label: "keepSpineItemLoaded()"
---

Keep the document of a spine item loaded in the reader, wherever the reader goes, until you release it. The reader otherwise loads only the spine items around the reading position: the ones visible, and `numberOfAdjacentSpineItemToPreLoad` on each side.

```typescript
const release = reader.keepSpineItemLoaded(3)
```

## Reference

`keepSpineItemLoaded(spineItem)`

```typescript
function keepSpineItemLoaded(spineItem: SpineItemReference): () => void
```

### Parameters

* `spineItem`: the spine item to keep loaded, by its index, by its id or as a `SpineItem`, as `reader.spineItemsManager.get()` takes it. An index or an id the book does not have is ignored.

### Returns

```typescript
() => void
```

The function that releases the hold:

* Holds add up: an item stays loaded until every hold on it is released, so two parts of your app can keep the same item loaded. Calling a release more than once releases its hold once.
* Releasing does not unload the item at once. Once the last hold on an item is released, the reader picks the items to load again, and unloads that item unless it is around the reading position.
* Once the reader is destroyed, a release does nothing: destroying the reader releases every document.

## When the document loads

The reader picks the spine items to load after every navigation and every layout, once the viewport is free and the book is laid out. A new hold makes it pick again, so the item loads shortly after the call, not by the time it returns. Before the reader is mounted, it loads once the reader is mounted and laid out.

Wait for the item before you use what only its loaded document gives: its `isReady$` emits `true` once the document is loaded and laid out.

```typescript
import { filter, finalize, take } from "rxjs"

const item = reader.spineItemsManager.get(3)

if (item) {
  const release = reader.keepSpineItemLoaded(item)

  const subscription = item.isReady$
    .pipe(
      filter((isReady) => isReady),
      take(1),
      finalize(release),
    )
    .subscribe(() => {
      // a reflowable item's pages are only measured while it is loaded
      console.log(item.numberOfPages)
    })
}
```

`finalize` releases the hold once the item is ready, and if you call `subscription.unsubscribe()` before that. Unsubscribe when you stop waiting: a document that fails to load stays in `error` while it is held, and its item never becomes ready, since the reader loads an item again only once it has unloaded it. See [Error handling](/learn/error-handling#errors-in-spine-item).

:::caution
Every item held keeps its document and its resources in memory, see [Performance](/learn/performances#number-of-pages-loaded). Release a hold as soon as you are done. To read a document without displaying it, [`renderHeadless()`](/core-api/reader/renderheadless) costs less.
:::

[`locateResource()`](/core-api/reader/locateresource) keeps the reflowable spine item it locates loaded this way, unless its `mode` is `"shallow"`, and the gallery enhancer's [`snapshot()`](/enhancers/gallery#snapshot) keeps the spine item it copies loaded until its copy is ready.
