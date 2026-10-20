---
title: "renderHeadless()"
---

Render a specific spine item document headless. Spine items can have more than one document iframe rendered (PDF for example render an extra canvas to show the page) but the document that matters to you is the one containing the actual content.

```typescript
const document$ = reader.renderHeadless(3)
```

## Reference

`renderHeadless(spineItem)`

```typescript
function renderHeadless(spineItem: SpineItemReference): Observable<{
    doc: Document;
    release: () => void;
} | undefined>
```

### Parameters

* `spineItem`: A reference to a spine item (index, id, ...)

### Returns

```typescript
Observable<{
    doc: Document;
    release: () => void;
} | undefined>
```

An observable that emits once, then completes:

* `doc`: the item's content as a document of its own, built by the item's renderer and never attached to the reader. For an HTML item it is the parsed resource; for a PDF page, the page's text layer.
* `release`: call it once you are done with `doc`. It tells the item's renderer it can free what it holds for the headless document. The built-in renderers hold nothing, but a [custom renderer](/learn/renderers) may.

It emits `undefined` when the spine item does not exist, when its renderer cannot render it headless (an audio item, or an HTML item whose resource is not an HTML or XML document), or when rendering fails.

```typescript
reader.renderHeadless(3).subscribe((result) => {
  if (!result) return

  console.log(result.doc.body.textContent)

  result.release()
})
```
