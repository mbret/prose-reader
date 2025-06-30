export const getPositionRelativeToNonTransformedElement = (
  position: { x: number; y: number },
  element: HTMLElement,
) => {
  const elementRect = element.getBoundingClientRect()
  const { x, y } = position
  const { left, top } = elementRect

  // Get the scale factors
  const scaleX = elementRect.width / element.offsetWidth
  const scaleY = elementRect.height / element.offsetHeight

  // Calculate position relative to the transformed element
  const relativeX = x - left
  const relativeY = y - top

  // Convert back to non-transformed coordinates
  return {
    x: relativeX / scaleX,
    y: relativeY / scaleY,
  }
}
