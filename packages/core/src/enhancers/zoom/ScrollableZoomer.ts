import { Report } from "../../report"
import { noopElement } from "../../utils/dom"
import { ZoomController } from "./ZoomController"

export const adjustScrollToKeepContentCentered = (
  scrollContainer: HTMLElement,
  fromScale: number,
  toScale: number,
) => {
  const containerWidth = scrollContainer.clientWidth
  const containerHeight = scrollContainer.clientHeight

  // Current scroll position
  const currentScrollLeft = scrollContainer.scrollLeft
  const currentScrollTop = scrollContainer.scrollTop

  // Calculate what's currently in the center of the visible area
  const visibleCenterX = currentScrollLeft + containerWidth / 2
  const visibleCenterY = currentScrollTop + containerHeight / 2

  // After scaling, calculate where we need to scroll to keep the same content centered
  const scaleFactor = toScale / fromScale
  const newVisibleCenterX = visibleCenterX * scaleFactor
  const newVisibleCenterY = visibleCenterY * scaleFactor

  // Calculate new scroll position to keep the center content visible
  const newScrollLeft = newVisibleCenterX - containerWidth / 2
  const newScrollTop = newVisibleCenterY - containerHeight / 2

  return { newScrollLeft, newScrollTop }
}

export class ScrollableZoomController extends ZoomController {
  public enter({
    scale = 1,
  }: {
    scale?: number
  } = {}): void {
    if (this.value.isZooming) return

    this.setScale(scale)

    this.mergeCompare({
      currentPosition: { x: 0, y: 0 },
      currentScale: scale,
      isZooming: true,
    })
  }

  public exit(): void {
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

    const { newScrollLeft, newScrollTop } = adjustScrollToKeepContentCentered(
      scrollContainer ?? noopElement(),
      currentScale,
      scale,
    )

    /**
     * When zooming out, we want to keep the content centered. Since we don't have a scrollbar we will cheat
     * with origin and force it centered.
     * When zooming in, we want to keep the content centered as well but we now have a scrollbar so we adjust it.
     * Keeping the origin centered would make it impossible to scroll the left content
     */
    if (scale < 1) {
      viewportElement.style.transformOrigin = `top`
      // We don't need to force the scrollbar to be visible when zooming out
      scrollNavigationElement.style.overflowX = "auto"
    } else if (scale > 1) {
      viewportElement.style.transformOrigin = `top left`
      scrollNavigationElement.style.overflowX = "scroll"
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
