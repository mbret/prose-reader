# Hooks

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

{% hint style="danger" %}
There is actually an `item.load$` event which you could respond to and it would work in this case because this hook is not yet asynchronous. However it might change in the future and this is why it is preferable to use hooks when you need to inject code at a specific lifecycle.
{% endhint %}

