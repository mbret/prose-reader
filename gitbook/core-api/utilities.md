# utilities

#### `observeBookBoundaryReached(reader)`

Product-level "user reached the start/end of the book" signal with last-item readiness so `"end"` events are withheld while the spine is still growing through lazy loads. `"start"` passes through immediately.

```typescript
observeBookBoundaryReached(reader)
```
