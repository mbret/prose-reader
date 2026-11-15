import { vi } from "vitest"
import type { Spine } from "../../spine/Spine"
import type { SpineItemsManager } from "../../spine/SpineItemsManager"
import { SpineItemSpineLayout } from "../../spine/types"
import { LayoutEntry } from "../../spineItem/types"

/**
 * Mock the place of each spine item in the spine, by index, and the box of
 * the spine that holds them all, as a completed layout gives them.
 */
export const mockSpineLayout = (
  spine: Spine,
  spineItemsManager: SpineItemsManager,
  itemLayouts: readonly SpineItemSpineLayout[],
) => {
  vi.spyOn(spine, "getSpineItemSpineLayoutInfo").mockImplementation((item) => {
    const itemIndex = spineItemsManager.getSpineItemIndex(item) ?? 0

    // biome-ignore lint/style/noNonNullAssertion: index in range
    return itemLayouts[itemIndex]!
  })

  const left = Math.min(...itemLayouts.map((layout) => layout.left))
  const right = Math.max(...itemLayouts.map((layout) => layout.right))
  const top = Math.min(...itemLayouts.map((layout) => layout.top))
  const bottom = Math.max(...itemLayouts.map((layout) => layout.bottom))

  vi.spyOn(spine, "layoutInfo", "get").mockReturnValue(
    new LayoutEntry({
      left,
      right,
      top,
      bottom,
      width: right - left,
      height: bottom - top,
      x: left,
      y: top,
    }),
  )
}

/**
 * Mock a horizontal LTR layout where every spine item is a `size` × `size`
 * square laid out side by side. Operates on the items built by the manager
 * from the manifest.
 */
export const mockSpineItemsLayout = (
  size: number,
  spine: Spine,
  spineItemsManager: SpineItemsManager,
) => {
  spineItemsManager.items.forEach((spineItem) => {
    vi.spyOn(spineItem, "layoutInfo", "get").mockReturnValue({
      width: size,
      height: size,
    })
  })

  mockSpineLayout(
    spine,
    spineItemsManager,
    spineItemsManager.items.map(
      (_, index) =>
        new SpineItemSpineLayout({
          left: index * size,
          top: 0,
          right: (index + 1) * size,
          bottom: size,
          width: size,
          height: size,
          x: index * size,
          y: 0,
        }),
    ),
  )

  return spineItemsManager.items
}
