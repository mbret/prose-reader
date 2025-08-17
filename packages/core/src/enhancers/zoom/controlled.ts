export const applyViewportTransformForControlledMode = (
  scale: number,
  position: { x: number; y: number },
  viewportElement: HTMLElement,
) => {
  viewportElement.style.transformOrigin = `0 0`

  const translateTransform = `translate3d(${position.x}px, ${position.y}px, 0px)`
  const scaleTransform = `scale(${scale})`

  viewportElement.style.transform = `${translateTransform} ${scaleTransform}`
}

export const derivePositionFromScaleForControlledMode = (
  currentScale: number,
  userScale: number,
  viewportElement: HTMLElement,
  currentPosition: { x: number; y: number },
) => {
  const scaleFactor = userScale / currentScale

  // Use clientWidth/clientHeight to get original dimensions before transforms
  const originalWidth = viewportElement.clientWidth
  const originalHeight = viewportElement.clientHeight

  // Calculate the center of what the user is currently seeing
  // Use original dimensions, not transformed ones
  const visualCenterX = originalWidth / 2 - currentPosition.x
  const visualCenterY = originalHeight / 2 - currentPosition.y

  // Calculate new position to keep the visual center fixed during scaling
  const newPosition = {
    x: currentPosition.x + visualCenterX * (1 - scaleFactor),
    y: currentPosition.y + visualCenterY * (1 - scaleFactor),
  }

  return newPosition
}
