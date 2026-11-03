/**
 * The scale a frame is rendered at along one axis: its rendered size over its
 * layout size. A frame with no layout size, hidden under `display: none` for
 * example, has no scale to measure, and is taken as unscaled. Dividing by its
 * size would give `NaN`, which no event accepts as a position.
 */
const getRenderedScale = ({
  renderedSize,
  layoutSize,
}: {
  renderedSize: number
  layoutSize: number
}) => (layoutSize > 0 ? renderedSize / layoutSize : 1)

/**
 * Take the relative position of the event in the iframe and translate
 * it to the page coordinates.
 *
 * For example the page 2 of an iframe could be at x=600 but
 * the cursor on the page would be at x=100. That is for a
 * webpage of 500px of width and not using spread.
 *
 * A hidden frame measures 0 by 0 at the corner of the page, so the position
 * stays the one in the frame.
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
}) => {
  // Get the frame's current transform scale
  const frameRect = frameElement.getBoundingClientRect()
  const scaleX = getRenderedScale({
    renderedSize: frameRect.width,
    layoutSize: frameElement.offsetWidth,
  })
  const scaleY = getRenderedScale({
    renderedSize: frameRect.height,
    layoutSize: frameElement.offsetHeight,
  })

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
