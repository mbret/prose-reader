import { HTML_PREFIX } from "../../constants"
import { UnboundScrollPosition } from "../../navigation/controllers/ScrollNavigationController"
import type { Reader } from "../../reader"
import { noopElement } from "../../utils/dom"

export const adjustScrollToKeepContentCentered = (
  scrollContainer: HTMLElement,
  fromScale: number,
  toScale: number,
  marginX: number,
  marginY: number,
) => {
  const containerWidth = scrollContainer.clientWidth
  const containerHeight = scrollContainer.clientHeight

  // Current scroll position
  const currentScrollLeft = scrollContainer.scrollLeft
  const currentScrollTop = scrollContainer.scrollTop

  // Calculate what's currently in the center of the visible area, accounting for margins
  const visibleCenterX = currentScrollLeft + containerWidth / 2 - marginX
  const visibleCenterY = currentScrollTop + containerHeight / 2 - marginY

  // After scaling, calculate where we need to scroll to keep the same content centered
  const scaleFactor = toScale / fromScale
  const newVisibleCenterX = visibleCenterX * scaleFactor
  const newVisibleCenterY = visibleCenterY * scaleFactor

  // Calculate new scroll position to keep the center content visible, accounting for margins
  const scrollLeft = newVisibleCenterX - containerWidth / 2 + marginX
  const scrollTop = newVisibleCenterY - containerHeight / 2 + marginY

  return new UnboundScrollPosition({
    x: scrollLeft,
    y: scrollTop,
  })
}

export const applyScaleToViewportForScroll = (
  scale: number,
  reader: Reader,
) => {
  const viewport = reader.viewport
  const scrollNavigationController =
    reader.navigation.scrollNavigationController
  const viewportElement = viewport.value.element
  const scrollContainer = scrollNavigationController.value.element
  const scrollNavigationElement = scrollNavigationController.value.element

  const currentScale = Math.round(viewport.scaleFactor * 100) / 100

  // We assume the viewport is directly under the scroll container
  // therefore we can use offsetLeft/offsetTop to get the margin
  const marginX = viewportElement.offsetLeft
  const marginY = viewportElement.offsetTop

  const newCenterPositionAfterNewScaleProjection =
    adjustScrollToKeepContentCentered(
      scrollContainer ?? noopElement(),
      currentScale,
      scale,
      marginX,
      marginY,
    )

  const direction = scale < 1 ? "down" : "up"
  scrollNavigationElement?.setAttribute(
    `data-${HTML_PREFIX}-zooming-direction`,
    direction,
  )

  /**
   * When zooming out, we want to keep the content centered. Since we don't have a scrollbar we will cheat
   * with origin and force it centered.
   * When zooming in, we want to keep the content centered as well but we now have a scrollbar so we adjust it.
   * Keeping the origin centered would make it impossible to scroll the left content
   */
  if (scale < 1) {
    viewportElement.style.transformOrigin = `top`
  } else if (scale > 1) {
    /**
     * @important
     * Transform origin `center` would cut left part of the content because it would expand
     * beyond the container on both side (albeit right side would be scrollable).
     * transform origin `left` would cut right part of the content if the viewport has margin
     * (eg: 50% viewport fit)
     * Therefore we need to use an origin that start at the actual content eliminating margin.
     */
    viewportElement.style.transformOrigin = `${marginX}px ${marginY}px`
  }

  viewportElement.style.transform = `scale(${scale})`

  const spinePosition = scrollNavigationController.fromScrollPosition(
    newCenterPositionAfterNewScaleProjection,
  )

  reader.navigation.navigate({
    position: spinePosition,
  })
}
