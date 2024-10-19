import { Context } from "../context/Context"
import { createSpineItemLocator } from "./locationResolver"
import { SafeSpineItemPosition, UnsafeSpineItemPosition } from "./types"
import { ReaderSettingsManager } from "../settings/ReaderSettingsManager"
import { SpineItem } from "./SpineItem"

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
    const { height, width } = spineItem.getElementDimensions()
    const numberOfPages = spineItemLocator.getSpineItemNumberOfPages({
      isUsingVerticalWriting: !!spineItem.isUsingVerticalWriting(),
      itemHeight: height,
      itemWidth: width,
    })

    return spineItemLocator.getSpineItemPositionFromPageIndex({
      pageIndex: numberOfPages - 1,
      isUsingVerticalWriting: !!spineItem.isUsingVerticalWriting(),
      itemLayout: spineItem.getElementDimensions(),
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
