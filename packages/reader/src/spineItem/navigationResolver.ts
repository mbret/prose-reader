import { SpineItem } from "./createSpineItem"
import { Context } from "../context"
import { getNumberOfPages } from "../pagination"
import { createLocationResolver } from "./locationResolver"

type SpineItemPosition = { x: number; y: number }

export const createNavigationResolver = ({ context }: { context: Context }) => {
  const spineItemLocator = createLocationResolver({ context })

  const getNavigationForLeftPage = (position: SpineItemPosition, spineItem: SpineItem): SpineItemPosition => {
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

    return spineItemLocator.getSpineItemClosestPositionFromUnsafePosition(nextPotentialPosition, spineItem)
  }

  const getNavigationForRightPage = (position: SpineItemPosition, spineItem: SpineItem): SpineItemPosition => {
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

    return spineItemLocator.getSpineItemClosestPositionFromUnsafePosition(nextPotentialPosition, spineItem)
  }

  const getNavigationForLastPage = (spineItem: SpineItem): SpineItemPosition => {
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

  const getNavigationForPage = (pageIndex: number, spineItem: SpineItem): SpineItemPosition => {
    const currentViewport = spineItemLocator.getSpineItemPositionFromPageIndex(pageIndex, spineItem)

    return currentViewport
  }

  const getNavigationFromNode = (spineItem: SpineItem, node: Node, offset: number) => {
    const position = spineItemLocator.getSpineItemPositionFromNode(node, offset, spineItem)

    return position || { x: 0, y: 0 }
  }

  const getNavigationForPosition = (spineItem: SpineItem, position: SpineItemPosition) => {
    const potentiallyCorrectedPosition = spineItemLocator.getSpineItemClosestPositionFromUnsafePosition(position, spineItem)

    return potentiallyCorrectedPosition
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
