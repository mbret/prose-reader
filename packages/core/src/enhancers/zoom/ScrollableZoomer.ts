import { BehaviorSubject } from "rxjs"
import { Report } from "../../report"
import { noopElement } from "../../utils/dom"
import { adjustScrollToKeepContentCentered } from "../layout/viewportMode"
import { ZoomController } from "./ZoomController"

export class ScrollableZoomer extends ZoomController {
  public element: HTMLDivElement | undefined
  public isZooming$ = new BehaviorSubject(false)
  public currentScale = 1
  public currentPosition = { x: 0, y: 0 }

  public enter(): void {
    this.currentScale = 1
    this.currentPosition = { x: 0, y: 0 }

    const spineElement = this.reader.spine.element
    const viewportElement = this.reader.viewport.value.element
    const scrollNavigationElement =
      this.reader.navigation.scrollNavigationController.value.element

    if (spineElement) {
      spineElement.style.transformOrigin = `0 0`
    }

    if (viewportElement) {
      viewportElement.style.transformOrigin = `0 0`
    }

    if (scrollNavigationElement) {
      scrollNavigationElement.style.overflowX = "scroll"
    }

    this.isZooming$.next(true)
  }

  public exit(): void {
    this.scaleAt(1)

    this.isZooming$.next(false)
  }

  /**
   * Panning is directly managed through the scroll navigator element.
   */
  public moveAt() {
    Report.warn("moveAt should not be called on scroll mode")
  }

  public scaleAt(userScale: number): void {
    const viewportElement = this.reader.viewport.value.element
    const scrollContainer =
      this.reader.navigation.scrollNavigationController.value.element

    if (!viewportElement || !viewportElement) return

    const roundedScale = Math.ceil(userScale * 100) / 100
    const newScale = Math.max(roundedScale, 1)

    const currentScale = this.reader.viewport.scaleFactor

    const { newScrollLeft, newScrollTop } = adjustScrollToKeepContentCentered(
      scrollContainer ?? noopElement(),
      currentScale,
      newScale,
    )

    viewportElement.style.transform = `scale(${newScale})`

    const spinePosition =
      this.reader.navigation.scrollNavigationController.fromScrollPosition({
        x: newScrollLeft,
        y: newScrollTop,
      })

    this.reader.navigation.navigate({
      position: spinePosition,
    })

    this.currentScale = newScale
  }
}
