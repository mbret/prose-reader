import type { CfiManager } from "../../cfi"
import type { SpineItemsManager } from "../../spine/SpineItemsManager"
import type { NavigationTarget } from "../types"

/**
 * Whether a target names a place in the book. A position always does, once
 * clamped to it. Every other target names a spine item, which the book has to
 * have; a malformed cfi names nothing at all.
 */
export const isTargetInBook = (
  target: NavigationTarget,
  {
    cfi,
    spineItemsManager,
  }: { cfi: CfiManager; spineItemsManager: SpineItemsManager },
): boolean => {
  switch (target.type) {
    case "position":
      return true
    case "spineItem":
      return spineItemsManager.get(target.value) !== undefined
    case "cfi":
      return cfi.getSpineItemFromCfi(target.value) !== undefined
    case "selector":
      return spineItemsManager.get(target.value.spineItem) !== undefined
  }
}
