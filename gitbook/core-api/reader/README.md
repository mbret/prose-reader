# reader

This API is available through the reader instance root level.

eg:

```typescript
const reader = createReader(...)

reader.locateResource(...)
```


## Initial position

```typescript
const reader = createReader({
  manifest,
  position: { format: "cfi", value: savedCfi },
})
reader.mount(container)
```

`position?: PositionTarget` is applied at mount. Omit it to start at the beginning. Register external [position formats](../position-formats.md) on `reader.positions` before mounting.
