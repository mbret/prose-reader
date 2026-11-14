---
title: "Reader hooks"
description: "Run your own code inside the reader's lifecycle with reader.hookManager, for example to inject CSS into a document before its pages are laid out."
sidebar:
  label: "Hooks"
---

Hooks are a different way to add functionality to the reading system. They offer a deeper control and let you hook specific logic within the internal process.

Remember that:

* **Not all** lifecycle or events are accessible through the public API (for good reasons)
* Hooks can and are often **asynchronous**.
* Hooks can and often read the **return values.** This is how you can change deeper behaviors.

Overall they offer a power and flexibility that is not possible with simple event or streams.

**Consider this use-case:**

I want to increase the font size of the document loaded. Changing the font size of the document will likely change its overall size. Maybe it will spread across 2 pages instead of 1. Because you want the layout process to account for your font size before recalculating the book page sizes you cannot just change the font size after a `layout$` event. You have to hook your logic within the layout process itself.

```typescript
reader.hookManager.register(`item.onDocumentLoad`, ({ itemId }) => {
  const item = reader.spineItemsManager.get(itemId)
  const frame = item?.renderer.getDocumentFrame()
  /**
   * Manually injecting your own css during the load process
   * will ensure the layout is taking the new font size into account.
   */
  frame && upsertCSSToFrame(frame, `fonts-style`, `
    * {
      font-size: 200%;
    }
  `)
})
```

The item is `loading` until its `item.onDocumentLoad` hooks are done, so the hook reaches the document through the renderer's frame. Code that reads the book's content, outside the load, reads the item's `loadedDocument` instead: it is the document only while the item is `loaded`, not while hooks still set it up, nor once it starts unloading. To react as it changes, follow `item.watch("loadStatus")` and read it there.

:::danger
Reacting to an item's `loadStatus` becoming `loaded`, from `reader.spineItemsObserver.itemLoadStatusChange$`, would work in this case too, because the reader lays the spine out after that change. Nothing guarantees that order, which is why a hook is preferable when you need to run code at a specific point of the lifecycle.
:::

## Running hooks

`register` returns a function that removes the hook.

An enhancer can declare hooks of its own: it creates a `HookManager` typed with them, and runs them with one of the methods below. `@prose-reader/enhancer-gestures` does so for `beforeTapGesture`. Each method runs the hooks registered under a name in the order of their registration.

| Method | Gives | A hook that throws |
| --- | --- | --- |
| `execute(name, params)` | The result of each hook | Stops the run: `execute` throws, and the hooks after it do not run |
| `executeIsolated(name, params)` | Nothing | Is [reported](/learn/error-handling#errors-the-reader-recovers-from), and the hooks after it still run |
| `executeSequential(name, params, getNextParams)` | The final parameters and the result of each hook. Each hook gets the parameters that `getNextParams` makes from the result of the hook before it | Stops the run: `executeSequential` throws |
| `executeAsync(name, id, params, signal?)` | A promise of the results. The hooks run in parallel, each with an `AbortSignal`, which `signal` aborts, and so does `destroy(name, id)` | Rejects the promise |
| `fromExecuteAsync(name, id, params)` | An observable of the results of `executeAsync`. Unsubscribing aborts the hooks | Errors the observable |

Use `executeIsolated` for hooks whose results nothing reads, so that one hook that throws stops neither the other hooks nor the work that runs them. Use `execute` or `executeSequential` when the caller reads the results: there, a hook that throws must not be taken for a hook that gave nothing.

## A layout hook that throws

An `item.onBeforeLayout` or `item.onAfterLayout` hook that throws does not stop the layout of its item: the reader lays the item out, and [reports the error](/learn/error-handling#errors-the-reader-recovers-from). The hooks registered after it still run.
