# Context



```typescript
type ContextState = {
  manifest?: Manifest
  hasVerticalWriting?: boolean
  isUsingSpreadMode?: boolean
  /**
   * Cover the case where either renditionLayout is pre-paginated
   * or if we detect all the pages being pre-paginated. This value
   * can be useful to detect a comics or manga type book. It uses
   * the manifest as well but offer more convenience.
   */
  isFullyPrePaginated?: boolean
}
```

## `.isUsingSpreadMode$`

```
Observable<boolean | undefined>
```

Replay observable, emit a value as soon as you subscribe.

Tells you whether the reader is using spread mode or not. Spread mode means two pages displayed rather than one. Usually used on landscape mode or large screens. The value will be undefined if no books are loaded.

.hasVerticalWriting
