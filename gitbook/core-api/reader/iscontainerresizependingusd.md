# isContainerResizePending$

```typescript
Observable<boolean>
```

Replay observable, emits the current value as soon as you subscribe.

`true` from the moment the container the reader is mounted into reports a new size, until the reader has started a layout for it or found it has nothing to lay out. The reader waits for the container to hold its size for 100 ms first, so this is true for at least that long after a resize. It is always `false` while `layoutAutoResize` is `false`.

Starting a layout measures the viewport at the new size, so once this is `false`, `reader.viewport` has the container's current size. The items are laid out after that, and [pagination](../../learn/pagination.md) settles once they are:

```typescript
import { filter, first, switchMap } from "rxjs"

reader.isContainerResizePending$
  .pipe(
    filter((pending) => !pending),
    first(),
    // the viewport has the container's current size; now wait for the content
    switchMap(() => reader.pagination.state$),
    filter((state) => state.isSettled),
    first(),
  )
  .subscribe((state) => {
    // the visible pages, laid out for the container's current size
  })
```
