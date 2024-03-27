import { SpineItem } from "./createSpineItem"
import { Context } from "../context/context"
import { getNumberOfPages } from "../pagination/pagination"
import { createLocationResolver } from "./locationResolver"
import { SpineItemNavigationPosition, UnsafeSpineItemPosition } from "./types"
import { Settings } from "../settings/settings"

export const createNavigationResolver = ({ context }: { context: Context, settings: Settings }) => {
  const spineItemLocator = createLocationResolver({ context })

  const getNavigationForLeftPage = (position: UnsafeSpineItemPosition, spineItem: SpineItem): SpineItemNavigationPosition => {
    let nextPotentialPosition = {
      x: position.x - context.getPageSize().width,
      y: position.y,
    }

    if (spineItem.isUsingVerticalWriting()) {
      nextPotentialPosition = {
        x: position.x,
        y: position.y + context.getPageSize().height,
      }
    }

    const navigationPosition = spineItemLocator.getSpineItemClosestPositionFromUnsafePosition(nextPotentialPosition, spineItem)

    return new SpineItemNavigationPosition(navigationPosition)
  }

  const getNavigationForRightPage = (position: UnsafeSpineItemPosition, spineItem: SpineItem): SpineItemNavigationPosition => {
    let nextPotentialPosition = {
      x: position.x + context.getPageSize().width,
      y: position.y,
    }

    if (spineItem.isUsingVerticalWriting()) {
      nextPotentialPosition = {
        x: position.x,
        y: position.y - context.getPageSize().height,
      }
    }

    const navigationPosition = spineItemLocator.getSpineItemClosestPositionFromUnsafePosition(nextPotentialPosition, spineItem)

    return new SpineItemNavigationPosition(navigationPosition)
  }

  const getNavigationForLastPage = (spineItem: SpineItem): SpineItemNavigationPosition => {
    if (spineItem.isUsingVerticalWriting()) {
      const pageHeight = context.getPageSize().height
      const numberOfPages = getNumberOfPages(spineItem.getElementDimensions().height, pageHeight)
      return getNavigationForPage(numberOfPages - 1, spineItem)
    } else {
      const pageWidth = context.getPageSize().width
      const numberOfPages = getNumberOfPages(spineItem.getElementDimensions().width, pageWidth)
      return getNavigationForPage(numberOfPages - 1, spineItem)
    }
  }

  const getNavigationForPage = (pageIndex: number, spineItem: SpineItem): SpineItemNavigationPosition => {
    const { x, y } = spineItemLocator.getSpineItemPositionFromPageIndex(pageIndex, spineItem)

    return new SpineItemNavigationPosition({ x, y })
  }

  const getNavigationFromNode = (spineItem: SpineItem, node: Node, offset: number): SpineItemNavigationPosition => {
    const position = spineItemLocator.getSpineItemPositionFromNode(node, offset, spineItem)

    return new SpineItemNavigationPosition(position || { x: 0, y: 0 })
  }

  const getNavigationForPosition = (spineItem: SpineItem, position: UnsafeSpineItemPosition): SpineItemNavigationPosition => {
    const potentiallyCorrectedPosition = spineItemLocator.getSpineItemClosestPositionFromUnsafePosition(position, spineItem)

    return new SpineItemNavigationPosition(potentiallyCorrectedPosition)
  }

  return {
    getNavigationForLeftPage,
    getNavigationForRightPage,
    getNavigationForLastPage,
    getNavigationForPage,
    getNavigationForPosition,
    getNavigationFromNode,
  }
}
