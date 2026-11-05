/**
 * The scale an element is rendered at along one axis: its rendered size, as
 * `getBoundingClientRect()` gives it, over its layout size. An element with no
 * layout size or no rendered size, hidden under `display: none` for example,
 * has no scale to measure, and counts as unscaled: dividing by its size would
 * give a value that is not finite, which no position can use.
 */
export const getRenderedScale = ({
  renderedSize,
  layoutSize,
}: {
  renderedSize: number
  layoutSize: number
}) => (layoutSize > 0 && renderedSize > 0 ? renderedSize / layoutSize : 1)

export const getPositionRelativeToNonTransformedElement = (
  position: { x: number; y: number },
  element: HTMLElement,
) => {
  const elementRect = element.getBoundingClientRect()
  const { x, y } = position
  const { left, top } = elementRect

  // Get the scale factors
  const scaleX = getRenderedScale({
    renderedSize: elementRect.width,
    layoutSize: element.offsetWidth,
  })
  const scaleY = getRenderedScale({
    renderedSize: elementRect.height,
    layoutSize: element.offsetHeight,
  })

  // Calculate position relative to the transformed element
  const relativeX = x - left
  const relativeY = y - top

  // Convert back to non-transformed coordinates
  return {
    x: relativeX / scaleX,
    y: relativeY / scaleY,
  }
}
