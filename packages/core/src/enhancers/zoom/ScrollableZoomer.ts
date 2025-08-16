import { HTML_PREFIX } from "../../constants"
import { Report } from "../../report"
import { noopElement } from "../../utils/dom"
import { ZoomController } from "./ZoomController"

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
  const newScrollLeft = newVisibleCenterX - containerWidth / 2 + marginX
  const newScrollTop = newVisibleCenterY - containerHeight / 2 + marginY

  return { newScrollLeft, newScrollTop }
}

export class ScrollableZoomController extends ZoomController {
  public enter({ scale = 1 }: { scale?: number } = {}): void {
    this.setScale(scale)

    this.mergeCompare({
      currentPosition: { x: 0, y: 0 },
      currentScale: scale,
      isZooming: true,
    })

    this.scrollNavigationController.value.element?.setAttribute(
      `data-${HTML_PREFIX}-zooming`,
      "true",
    )
  }

  public exit(): void {
    super.exit()

    this.setScale(1)

    this.mergeCompare({
      isZooming: false,
      currentScale: 1,
    })
  }

  /**
   * Panning is directly managed through the scroll navigator element.
   */
  public moveAt() {
    Report.warn("moveAt should not be called on scroll mode")
  }

  protected setScale(scale: number) {
    const viewportElement = this.reader.viewport.value.element
    const scrollContainer =
      this.reader.navigation.scrollNavigationController.value.element
    const scrollNavigationElement =
      this.reader.navigation.scrollNavigationController.value.element

    if (!viewportElement || !scrollNavigationElement) return

    const currentScale = this.reader.viewport.scaleFactor

    // We assume the viewport is directly under the scroll container
    // therefore we can use offsetLeft/offsetTop to get the margin
    const marginX = viewportElement.offsetLeft
    const marginY = viewportElement.offsetTop

    const { newScrollLeft, newScrollTop } = adjustScrollToKeepContentCentered(
      scrollContainer ?? noopElement(),
      currentScale,
      scale,
      marginX,
      marginY,
    )

    const direction = scale < 1 ? "down" : "up"
    scrollNavigationElement.setAttribute(
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

    const spinePosition =
      this.reader.navigation.scrollNavigationController.fromScrollPosition({
        x: newScrollLeft,
        y: newScrollTop,
      })

    this.reader.navigation.navigate({
      position: spinePosition,
    })
  }

  public scaleAt(userScale: number): void {
    const roundedScale = Math.ceil(userScale * 100) / 100
    const newScale = roundedScale

    this.setScale(newScale)

    this.mergeCompare({
      currentScale: newScale,
    })
  }
}
