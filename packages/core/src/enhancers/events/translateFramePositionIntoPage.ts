/**
 * Take the relative position of the event in the iframe and translate
 * it to the page coordinates.
 * 
 * For example the page 2 of an iframe could be at x=600 but
 * the cursor on the page would be at x=100. That is for a 
 * webpage of 500px of width and not using spread.
 */
export const translateFramePositionIntoPage = ({
  position,
  frameElement,
}: {
  position: {
    clientX: number
    clientY: number
  }
  frameElement: HTMLIFrameElement
  pageWidth: number
  pageHeight: number
}) => {
  // Get the frame's current transform scale
  const frameRect = frameElement.getBoundingClientRect()
  const scaleX = frameRect.width / frameElement.offsetWidth
  const scaleY = frameRect.height / frameElement.offsetHeight

  // Get the frame's position relative to the viewport
  const { left = 0, top = 0 } = frameRect

  // Transform the coordinates:
  // 1. Scale the position from iframe coordinates
  // 2. Add the frame's offset relative to viewport
  const adjustedX = position.clientX * scaleX + left
  const adjustedY = position.clientY * scaleY + top

  return {
    clientX: adjustedX,
    clientY: adjustedY,
  }
}
