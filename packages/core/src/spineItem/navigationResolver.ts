import type { Context } from "../context/Context"
import type { ReaderSettingsManager } from "../settings/ReaderSettingsManager"
import { createSpineItemLocator } from "./locationResolver"
import type { SpineItem } from "./SpineItem"
import { SpineItemPosition } from "./types"

export type SpineItemNavigationResolver = ReturnType<
  typeof createNavigationResolver
>

export const createNavigationResolver = ({
  context,
  settings,
}: {
  context: Context
  settings: ReaderSettingsManager
}) => {
  const spineItemLocator = createSpineItemLocator({ context, settings })

  const getNavigationForLastPage = (spineItem: SpineItem) => {
    const numberOfPages = spineItem.numberOfPages

    return spineItemLocator.getSpineItemPositionFromPageIndex({
      pageIndex: numberOfPages - 1,
      spineItem,
    })
  }

  const getNavigationFromNode = (
    spineItem: SpineItem,
    node: Node,
    offset: number,
  ): SpineItemPosition => {
    const position = spineItemLocator.getSpineItemPositionFromNode(
      node,
      offset,
      spineItem,
    )

    return position || new SpineItemPosition({ x: 0, y: 0 })
  }

  const getNavigationForPosition = (
    spineItem: SpineItem,
    position: SpineItemPosition,
  ): SpineItemPosition => {
    const potentiallyCorrectedPosition =
      spineItemLocator.getSpineItemClosestPositionFromUnsafePosition(
        position,
        spineItem,
      )

    return potentiallyCorrectedPosition
  }

  return {
    getNavigationForLastPage,
    getNavigationForPosition,
    getNavigationFromNode,
  }
}
