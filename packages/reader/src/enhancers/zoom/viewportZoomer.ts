import { BehaviorSubject } from "rxjs"
import { getNewScaledOffset } from "../../utils/layout"
import { ReaderInstance } from "./types"

export const createViewportZoomer = (reader: ReaderInstance) => {
  const isZooming$ = new BehaviorSubject<boolean>(false)
  // we use this value to compare with given scale. This allow user to keep scaling normally
  // even when doing several pinching one after another
  let baseScale = 1
  let lastUserScale = 1

  const reset = () => {
    // we go all the way back to 0
    scale(0 - baseScale)
    lastUserScale = 1
    baseScale = 1
  }

  const enter = () => {
    reset()

    reader.spine.element.style.transformOrigin = `0 0`

    isZooming$.next(true)

    scale(1)
    setCurrentScaleAsBase()
  }

  const setCurrentScaleAsBase = () => {
    baseScale = lastUserScale
  }

  const scale = (userScale: number) => {
    const roundedScale = Math.ceil((userScale < 1 ? baseScale - (1 - userScale) : baseScale + (userScale - 1)) * 100) / 100
    const newScale = Math.max(roundedScale, 1)

    // GET CURRENT SCALE
    // no need to check for Y as both axis have same scale
    const currentScale = reader.spine.element.getBoundingClientRect().width / reader.spine.element.offsetWidth

    const currentScrollTop = reader.viewportNavigator.element.scrollTop

    // viewportNavigator.element.scrollTop does not change after the scale change thanks to fixed origin position
    // the scroll offset is the one before the new scale and can be used to add / remove on newly scaled view
    reader.spine.element.style.transform = `scale(${newScale})`

    reader.viewportNavigator.element.scrollLeft = getNewScaledOffset({
      newScale,
      oldScale: currentScale,
      pageSize: reader.viewportNavigator.element.clientWidth,
      screenSize: reader.spine.element.offsetWidth,
      scrollOffset: reader.viewportNavigator.element.scrollLeft
    })
    reader.viewportNavigator.element.scrollTop = getNewScaledOffset({
      newScale,
      oldScale: currentScale,
      pageSize: reader.viewportNavigator.element.clientHeight,
      screenSize: reader.spine.element.offsetHeight,
      scrollOffset: currentScrollTop
    })

    lastUserScale = newScale
  }

  const move = (_: { x: number; y: number } | undefined, __: { isFirst: boolean; isLast: boolean }) => {}

  const exit = () => {
    reset()
    isZooming$.next(false)
  }

  const _isZooming = () => isZooming$.value

  const destroy = () => {
    isZooming$.complete()
  }

  return {
    enter,
    exit,
    move,
    scale,
    setCurrentScaleAsBase,
    getScaleValue: () => lastUserScale,
    isZooming: _isZooming,
    destroy,
    isZooming$: isZooming$.asObservable()
  }
}
