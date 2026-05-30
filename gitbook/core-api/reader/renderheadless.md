# renderHeadless()

Render a specific spine item document headless. Spine items can have more than one document iframe rendered (PDF for example render an extra canvas to show the page) but the document that matters to you is the one containing the actual content.

```typescript
const document$ = reader.renderHeadless(3)
```

## Reference

`renderHeadless(spineItem)`

```typescript
function locateResource(spineItem: SpineItemReference): Observable<{
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

An observable containing frame document or undefined

