import { BehaviorSubject, Observable } from "rxjs"
import { getNewScaledOffset } from "../../utils/layout"
import { Zoomer } from "./Zoomer"

export class ScrollableZoomer extends Zoomer {
  public element: HTMLDivElement | undefined
  public isZooming$ = new BehaviorSubject(false)
  public currentScale = 1
  public currentPosition = { x: 0, y: 0 }

  public enter(): void {
    this.currentScale = 1
    this.currentPosition = { x: 0, y: 0 }

    const spineElement = this.reader.spine.element

    if (spineElement) {
      spineElement.style.transformOrigin = `0 0`
    }

    this.isZooming$.next(true)
  }

  public exit(): void {
    this.scaleAt(1)

    this.isZooming$.next(false)
  }

  public moveAt() {
    // moved by user scroll
  }

  public scaleAt(userScale: number): void {
    const spineElement = this.reader.spine.element
    const viewportElement = this.reader.navigation.getElement()

    if (!spineElement || !viewportElement) return

    const roundedScale = Math.ceil(userScale * 100) / 100
    const newScale = Math.max(roundedScale, 1)

    // GET CURRENT SCALE
    // no need to check for Y as both axis have same scale
    const currentScale =
      spineElement.getBoundingClientRect().width / spineElement.offsetWidth

    const currentScrollTop = viewportElement.scrollTop

    // navigator.element.scrollTop does not change after the scale change thanks to fixed origin position
    // the scroll offset is the one before the new scale and can be used to add / remove on newly scaled view
    spineElement.style.transform = `scale(${newScale})`

    viewportElement.scrollLeft = getNewScaledOffset({
      newScale,
      oldScale: currentScale,
      pageSize: viewportElement.clientWidth,
      screenSize: spineElement.offsetWidth,
      scrollOffset: viewportElement.scrollLeft,
    })

    viewportElement.scrollTop = getNewScaledOffset({
      newScale,
      oldScale: currentScale,
      pageSize: viewportElement.clientHeight,
      screenSize: spineElement.offsetHeight,
      scrollOffset: currentScrollTop,
    })

    this.currentScale = roundedScale
  }
}
