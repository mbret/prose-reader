import { ReadingItem } from "."
import { Context } from "../context"
import { getNumberOfPages } from "../pagination"
import { createLocationResolver } from "./locationResolver"

type ReadingItemPosition = { x: number, y: number }

export const createNavigationResolver = ({ context }: { context: Context }) => {
  const readingItemLocator = createLocationResolver({ context })

  const getNavigationForLeftPage = (position: ReadingItemPosition, readingItem: ReadingItem): ReadingItemPosition => {
    let nextPotentialPosition = {
      x: position.x - context.getPageSize().width,
      y: position.y
    }

    if (readingItem.isUsingVerticalWriting()) {
      nextPotentialPosition = {
        x: position.x,
        y: position.y + context.getPageSize().height
      }
    }

    return readingItemLocator.getReadingItemClosestPositionFromUnsafePosition(nextPotentialPosition, readingItem)
  }

  const getNavigationForRightPage = (position: ReadingItemPosition, readingItem: ReadingItem): ReadingItemPosition => {
    let nextPotentialPosition = {
      x: position.x + context.getPageSize().width,
      y: position.y
    }

    if (readingItem.isUsingVerticalWriting()) {
      nextPotentialPosition = {
        x: position.x,
        y: position.y - context.getPageSize().height
      }
    }

    return readingItemLocator.getReadingItemClosestPositionFromUnsafePosition(nextPotentialPosition, readingItem)
  }

  const getNavigationForLastPage = (readingItem: ReadingItem): ReadingItemPosition => {
    if (readingItem.isUsingVerticalWriting()) {
      const pageHeight = context.getPageSize().height
      const numberOfPages = getNumberOfPages(readingItem.getElementDimensions().height, pageHeight)
      return getNavigationForPage(numberOfPages - 1, readingItem)
    } else {
      const pageWidth = context.getPageSize().width
      const numberOfPages = getNumberOfPages(readingItem.getElementDimensions().width, pageWidth)
      return getNavigationForPage(numberOfPages - 1, readingItem)
    }
  }

  const getNavigationForPage = (pageIndex: number, readingItem: ReadingItem): ReadingItemPosition => {
    const currentViewport = readingItemLocator.getReadingItemPositionFromPageIndex(pageIndex, readingItem)

    return currentViewport
  }

  const getNavigationFromNode = (readingItem: ReadingItem, node: Node, offset: number) => {
    const position = readingItemLocator.getReadingItemPositionFromNode(node, offset, readingItem)

    return position || { x: 0, y: 0 }
  }

  const getNavigationForPosition = (readingItem: ReadingItem, position: ReadingItemPosition) => {
    const potentiallyCorrectedPosition = readingItemLocator.getReadingItemClosestPositionFromUnsafePosition(position, readingItem)

    return potentiallyCorrectedPosition
  }

  return {
    getNavigationForLeftPage,
    getNavigationForRightPage,
    getNavigationForLastPage,
    getNavigationForPage,
    getNavigationForPosition,
    getNavigationFromNode
  }
}
