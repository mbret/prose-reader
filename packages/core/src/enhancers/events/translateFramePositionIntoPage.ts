import { getFrameViewportInfo } from "../../utils/frames"

export const translateFramePositionIntoPage = ({
  position,
  frameElement,
  pageWidth,
  pageHeight,
}: {
  position: {
    clientX: number
    clientY: number
  }
  frameElement: HTMLIFrameElement
  pageWidth: number
  pageHeight: number
}) => {
  const {
    height: viewportHeight = pageHeight,
    width: viewportWidth = pageWidth,
  } = getFrameViewportInfo(frameElement)
  const computedWidthScale = pageWidth / viewportWidth
  const computedScale = Math.min(
    computedWidthScale,
    pageHeight / viewportHeight,
  )

  // Here we use getBoundingClientRect meaning we will get relative value for left / top based on current
  // window (viewport). This is handy because we can easily get the translated x/y without any extra information
  // such as page index, etc. However this might be a bit less performance to request heavily getBoundingClientRect
  const { left = 0, top = 0 } = frameElement?.getBoundingClientRect() || {}
  const adjustedX = position.clientX * computedScale + left
  const adjustedY = position.clientY * computedScale + top

  return {
    clientX: adjustedX,
    clientY: adjustedY,
  }
}
