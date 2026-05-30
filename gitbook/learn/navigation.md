# Navigation

Navigation is not a simple task and can be done in many ways depending on the use case. This is why we have two categories of navigation; **spatial** and **direct.**

## Spatial navigation

Often useful when you want to navigate based on buttons or gesture. For example a swipe to the left triggers a `turnLeft`, to the right a `turnRight`. It's easier to call these spatial methods because it correlates directly with what the user is expecting and is especially useful for UX elements.&#x20;

## Direct navigation

These represent methods such as `goToItem`, `goToPage`, `goToUrl`, etc. They are not directional nor spatial and are used when you know exactly where you want to go. They are usually used for navigating by bookmarks, table of contents, links and other.



```typescript
type NavigationState {
  /**
   * Spatial indicator whether you can turn
   * page to the left to reach a new spine item
   */
  canGoLeftSpineItem: boolean
  /**
   * Spatial indicator whether you can turn
   * page to the right to reach a new spine item
   */
  canGoRightSpineItem: boolean
  /**
   * Spatial indicator whether you can turn
   * page to the top to reach a new spine item
   */
  canGoTopSpineItem: boolean
  /**
   * Spatial indicator whether you can turn
   * page to the bottom to reach a new spine item
   */
  canGoBottomSpineItem: boolean
}
```

## `navigation.state$`

```typescript
Observable<NavigationState>
```

Emits as soon as you subscribe to it.

## `navigation.goToNextSpineItem()`

Navigate to the next available spine item.

## `navigation.goToPreviousSpineItem()`

Navigate to the previous available spine item.

## `navigation.goToLeftSpineItem()`

Navigate to the next spine item available at the left.  It will never navigate if the pages turn vertically.

## `navigation.goToRightSpineItem()`

Navigate to the next spine item available at the right. It will never navigate if the pages turn vertically.
