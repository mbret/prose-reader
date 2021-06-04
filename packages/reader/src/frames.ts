import { Context } from "./context"
import { Pagination } from "./pagination"
import { ReadingItem } from "./readingItem"

export const translateFramePositionIntoPage = (
  context: Context,
  pagination: Pagination,
  position: { x: number, y: number },
  readingItem: ReadingItem | undefined
) => {
  // @todo check when frame is moving cause the x will probably change
  // when only static turn, it will always be 0 ? but when global viewport move it will change as well
  const { left: iframeLeft = 0, width: iframeWidth = 0 } = readingItem?.getFrameLayoutInformation() || {}
  const { computedScale = 1 } = readingItem?.getViewPortInformation() || {}
  const pageSize = context.getPageSize()
  const numberOfPages = pagination.getNumberOfPages() || 0
  const pageIndex = pagination.getPageIndex() || 0

  const scaledX = position.x * computedScale
  const offsetAdjustedX = Math.max(0, iframeLeft + scaledX)

  const adjustedX = offsetAdjustedX > pageSize.width
    ? context.isRTL()
      ? offsetAdjustedX - (pageSize.width * ((numberOfPages - 1) - pageIndex))
      : offsetAdjustedX - (pageSize.width * pageIndex)
    : offsetAdjustedX

  return {
    x: adjustedX,
    // @todo
    y: position.y,
  }
}

export const createRemoveStyleHelper = (frameElement: HTMLIFrameElement | undefined) => (id: string) => {
  if (
    frameElement &&
    frameElement.contentDocument &&
    frameElement.contentDocument.head
  ) {
    const styleElement = frameElement.contentDocument.getElementById(id)
    if (styleElement) {
      styleElement.remove()
    }
  }
}

export const createAddStyleHelper = (frameElement: HTMLIFrameElement | undefined) => (id: string, style: string, prepend = false) => {
  if (
    frameElement &&
    frameElement.contentDocument &&
    frameElement.contentDocument.head
  ) {
    const userStyle = document.createElement('style')
    userStyle.id = id
    userStyle.innerHTML = style
    if (prepend) {
      frameElement.contentDocument.head.prepend(userStyle)
    } else {
      frameElement.contentDocument.head.appendChild(userStyle)
    }
  }
}

export const getAttributeValueFromString = (string: string, key: string) => {
  const regExp = new RegExp(key + '\\s*=\\s*([0-9.]+)', 'i')
  const match = string.match(regExp) || []
  const firstMatch = match[1] || `0`

  return (match && parseFloat(firstMatch)) || 0
}