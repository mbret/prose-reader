# locateResource()

Locate a given resource and give you extra information such as absolute page index, relevant nodes, offset etc. This is most useful when you want to locate resources such as CFI.

This method is live, it will return an observable that emits every time the reader layout.

```typescript
const consolidatedResource$ = reader.locateResource(resource, options)
```

## Reference

`locateResource(resource, options)`

```typescript
type CfiLocatableResource = {
  cfi: string
}

type ProseParsedCfi {
  // This will always be set and is statically inferred from the CFI format.
  // This does not mean the range is valid.
  isCfiRange: boolean
  itemIndex?: number
}

export type LocatableResource = SpineItem | CfiLocatableResource

export type ConsolidatedResource = CfiLocatableResource & ProseParsedCfi & {
  itemPageIndex?: number
  absolutePageIndex?: number
  startNode?: Node
  startOffset?: number
  // This is the resolved range if there is one and if it's resolvable.
  // Meaning, a valid range for this book item
  range?: Range
}

locateResource(resource, options)
```

### Parameters

* `resource`: An object or array of objects that extends `LocatableResource`. When using a cfi, all resources sharing the same cfi will share the same consolidation stream.
* `options?` :&#x20;
  * `mode?:`"shallow" | "load" : Default `load`. Shallow means that the item will not be loaded if needed, load will force load an item. By using shallow you avoid loading documents excessively but you will only get the values as precise as possible with the current reader state.

### Returns

```typescript
Observable<{ resource: T; meta: ConsolidatedResource }>
```

Or if you passed an array of resources

```typescript
Observable<{ resource: T; meta: ConsolidatedResource }[]>
```

An observable containing the initial resources and their consolidated metadata.

