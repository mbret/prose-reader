import { vi } from "vitest"
import { SpineItem } from "../.."
import type { Context } from "../../context/Context"
import type { HookManager } from "../../hooks/HookManager"
import type { ReaderSettingsManager } from "../../settings/ReaderSettingsManager"
import type { Spine } from "../../spine/Spine"
import type { SpineItemsManager } from "../../spine/SpineItemsManager"
import { SpineItemSpineLayout } from "../../spine/types"

const createSpineItem = (
  item: {
    left: number
    top: number
    right: number
    bottom: number
    width: number
    height: number
  },
  context: Context,
  index: number,
  settings: ReaderSettingsManager,
  hookManager: HookManager,
) => {
  const containerElement = document.createElement("div")

  const spineItem = new SpineItem(
    // biome-ignore lint/suspicious/noExplicitAny: TODO
    {} as any,
    containerElement,
    context,
    settings,
    hookManager,
    index,
  )

  vi.spyOn(spineItem.layout, "layoutInfo", "get").mockReturnValue({
    // left: item.left,
    // top: item.top,
    width: item.width,
    height: item.height,
    // right: item.right,
    // bottom: item.bottom,
    // x: item.left,
    // y: item.top,
  })

  return spineItem
}

export const generateItems = (
  size: number,
  number: number,
  context: Context,
  settings: ReaderSettingsManager,
  hookManager: HookManager,
  spine: Spine,
  spineItemsManager: SpineItemsManager,
) => {
  const layoutInfos: SpineItemSpineLayout[] = Array.from(Array(number)).map(
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
  )

  const items = Array.from(Array(number)).map((_, index) =>
    createSpineItem(
      // biome-ignore lint/style/noNonNullAssertion: TODO
      layoutInfos[index]!,
      context,
      index,
      settings,
      hookManager,
    ),
  )

  vi.spyOn(spine, "getSpineItemSpineLayoutInfo").mockImplementation((item) => {
    const itemIndex = spineItemsManager.getSpineItemIndex(item) ?? 0

    // biome-ignore lint/style/noNonNullAssertion: TODO
    return layoutInfos[itemIndex]!
  })

  return items
}
