export const getNewScaledOffset = ({
  newScale,
  oldScale,
  screenSize,
  scrollOffset,
}: {
  screenSize: number
  pageSize: number
  scrollOffset: number
  newScale: number
  oldScale: number
}) => {
  const centerXPosition = (screenSize * newScale) / 2 - screenSize + screenSize / 2
  const oldCenterPosition = (screenSize * oldScale) / 2 - screenSize + screenSize / 2
  const scaleDifference = newScale / oldScale
  const realScrollOffset = scrollOffset - oldCenterPosition

  return Math.max(centerXPosition + realScrollOffset * scaleDifference, 0)
}
