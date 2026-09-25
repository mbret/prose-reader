# Context

The context holds the book and the state of the reader that the rest of the engine builds on. The manifest is fixed for the lifetime of the reader; everything else is runtime state.

```typescript
type ContextState = {
  manifest: Manifest
  /**
   * The container the reader is mounted into. Undefined until `mount()`.
   */
  rootElement?: HTMLElement
  /**
   * Whether a loaded document uses vertical writing. Undefined until one
   * has been detected.
   */
  hasVerticalWriting?: boolean
  /**
   * The rendition layout from the manifest, `reflowable` when it has none.
   */
  assumedRenditionLayout: "reflowable" | "pre-paginated"
  /**
   * Cover the case where either renditionLayout is pre-paginated
   * or if we detect all the pages being pre-paginated. This value
   * can be useful to detect a comics or manga type book. It uses
   * the manifest as well but offer more convenience.
   */
  isFullyPrePaginated: boolean
  /**
   * Whether the book can be shown in a spread at all. It cannot when its
   * `rendition:spread` is `none` or its `rendition:flow` is
   * `scrolled-continuous`, and the `spreadMode` setting then changes nothing.
   */
  isSpreadAllowed: boolean
}
```

Read a value with `reader.context.value`, or follow it with `reader.context.watch(key)`, which emits the current value as soon as you subscribe and again whenever it changes.

Whether two pages are shown side by side is not part of the context: the viewport decides it with its size, within what `isSpreadAllowed` permits. See [Spread mode](viewport.md#spread-mode).
