import { BehaviorSubject, map, of, switchMap } from "rxjs"
import { Report } from "../../report"
import { createElementZoomer } from "./elementZoomer"
import { ZoomEnhancer } from "./types"
import { createViewportZoomer } from "./viewportZoomer"

export const zoomEnhancer: ZoomEnhancer = (next) => (options) => {
  const reader = next(options)
  const elementZoomer = createElementZoomer(reader)
  const viewportZoomer = createViewportZoomer(reader)
  const currentZoomer = new BehaviorSubject<typeof elementZoomer | undefined>(
    undefined
  )

  const isUsingScrollableViewport = () =>
    reader.context.getSettings().computedPageTurnMode === `scrollable`

  const enter = (imgElement?: HTMLImageElement) => {
    currentZoomer?.value?.exit()

    if (isUsingScrollableViewport()) {
      viewportZoomer.enter()
      currentZoomer?.next(viewportZoomer)

      return
    }

    if (!imgElement) {
      Report.warn(`You should specify an element to zoom at`)
      return
    }

    elementZoomer.enter(imgElement)
    currentZoomer?.next(elementZoomer)
  }

  const setCurrentScaleAsBase = () => {
    currentZoomer.value?.setCurrentScaleAsBase()
  }

  const scale = (userScale: number) => {
    if (!currentZoomer.value?.isZooming()) {
      Report.warn(`You need to start zoom before being able to call this fn`)
      return
    }

    currentZoomer.value.scale(userScale)
  }

  const move = (
    delta: { x: number; y: number } | undefined,
    options: { isFirst: boolean; isLast: boolean }
  ) => {
    currentZoomer.value?.move(delta, options)
  }

  const exit = () => {
    currentZoomer.value?.exit()
  }

  const destroy = () => {
    elementZoomer.destroy()
    viewportZoomer.destroy()
    currentZoomer.complete()
    reader.destroy()
  }

  return {
    ...reader,
    destroy,
    zoom: {
      enter,
      exit,
      move,
      isZooming: () => currentZoomer.value?.isZooming() || false,
      getScaleValue: () => currentZoomer.value?.getScaleValue() || 1,
      scale,
      isUsingScrollableZoom: isUsingScrollableViewport,
      setCurrentScaleAsBase,
      $: {
        isZooming$: currentZoomer.pipe(
          switchMap((zoomer) => zoomer?.isZooming$ || of(false))
        )
      }
    }
  }
}
