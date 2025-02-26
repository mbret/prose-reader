import type { Context } from "../context/Context"
import type { ReaderSettingsManager } from "../settings/ReaderSettingsManager"
import type { SpineItem } from "./SpineItem"
import { createSpineItemLocator } from "./locationResolver"
import type { SafeSpineItemPosition, UnsafeSpineItemPosition } from "./types"

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

  const getNavigationForLastPage = (
    spineItem: SpineItem,
  ): SafeSpineItemPosition => {
    const { height, width } = spineItem.layoutPosition
    const numberOfPages = spineItemLocator.getSpineItemNumberOfPages({
      isUsingVerticalWriting: !!spineItem.isUsingVerticalWriting(),
      itemHeight: height,
      itemWidth: width,
    })

    return spineItemLocator.getSpineItemPositionFromPageIndex({
      pageIndex: numberOfPages - 1,
      isUsingVerticalWriting: !!spineItem.isUsingVerticalWriting(),
      itemLayout: spineItem.layoutPosition,
    })
  }

  const getNavigationFromNode = (
    spineItem: SpineItem,
    node: Node,
    offset: number,
  ): SafeSpineItemPosition => {
    const position = spineItemLocator.getSpineItemPositionFromNode(
      node,
      offset,
      spineItem,
    )

    return position || { x: 0, y: 0 }
  }

  const getNavigationForPosition = (
    spineItem: SpineItem,
    position: UnsafeSpineItemPosition,
  ): SafeSpineItemPosition => {
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
