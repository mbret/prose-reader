# Selection

## Selection across pages

Selecting texts across pages is **only possible** within the same document frame. Typically for several pages of a same spine item (eg: epub long chapter). This is unfortunately **not possible** when pages are separated document frames. This is because selections are scoped per frames.

This is a limitation that is close to impossible to solve because having a document frame per item is how the reading system can display each document in their own sandbox, with their own styles, scripts etc. That would require a radical change of implementation at its core and as far as we know this is not currently possible.

## Multiple selections

It is possible for the user to do multiple selections if they decide to select texts in different document frames. Currently, the `selection` API will only return the last selection. This is technically possible to return all current selections but is currently not implemented.

## API

```typescript
type SelectionChange = {
  itemIndex: number
  type: "change"
  selection: Selection
}

type SelectionOver = {
  itemIndex: number
  type: "over"
  event: Event
  selection: Selection
}

type SelectionValue = SelectionChange | SelectionOver | undefined
```

### `selection.selection$`

```typescript
Observable<SelectionValue>
```

Emits the current selection

### `selection.selectionStart$`

```typescript
Observable<void>
```

Emits when the user starts a selection

### `selection.selectionEnd$`

```typescript
Observable<void>
```

Emits when the user ends a selection

### `selection.selectionOver$`

```typescript
Observable<SelectionOver>
```

Emits when user releases the pointer after a selection

### `selection.lastSelectionOnPointerDown$`

```typescript
Observable<SelectionValue>
```

Useful to know about the selection state before a pointerdown event. For example if you want to prevent certain action on click if user is discarding a selection. A good example is delaying the opening of a reader menu by discarding the current selection before toggling the menu.

### `selection.getSelection()`

```typescript
function getSelection(): SelectionValue
```

Return the current selection synchronously.

### `selection.createOrderedRangeFromSelection()`

```typescript
function createOrderedRangeFromSelection(params: {
  selection: {
    anchorNode?: Node | null
    anchorOffset?: number
    focusNode?: Node | null
    focusOffset?: number
  }
  spineItem: SpineItem
}): Range | undefined
```

Create and return an ordered range from a selection. This will sort out the start and end node automatically. This range can be safely used to generate CFI or other manipulations.
