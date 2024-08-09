/* eslint-disable @typescript-eslint/no-unused-vars */
import { BehaviorSubject } from "rxjs"
import { Reader } from "../../reader"
import { getNewScaledOffset } from "../../utils/layout"

export const createViewportZoomer = (reader: Reader) => {
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

    const spineElement = reader.spine.element

    if (spineElement) {
      spineElement.style.transformOrigin = `0 0`
    }

    isZooming$.next(true)

    scale(1)
    setCurrentScaleAsBase()
  }

  const setCurrentScaleAsBase = () => {
    baseScale = lastUserScale
  }

  const scale = (userScale: number) => {
    const spineElement = reader.spine.element
    const viewportElement = reader.navigation.getElement()

    if (!spineElement || !viewportElement) return

    const roundedScale =
      Math.ceil(
        (userScale < 1
          ? baseScale - (1 - userScale)
          : baseScale + (userScale - 1)) * 100,
      ) / 100
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

    lastUserScale = newScale
  }

  const move = (
    _: { x: number; y: number } | undefined,
    __: { isFirst: boolean; isLast: boolean },
  ) => {}

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
    isZooming$: isZooming$.asObservable(),
  }
}
