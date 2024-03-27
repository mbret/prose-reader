import { BehaviorSubject, of, switchMap } from "rxjs"
import { Reader } from "../../reader"
import { Report } from "../../report"
import { createElementZoomer } from "./elementZoomer"
import type { Api } from "./types"
import { createViewportZoomer } from "./viewportZoomer"

export const zoomEnhancer =
  <InheritOptions, InheritOutput extends Reader>(next: (options: InheritOptions) => InheritOutput) =>
  (options: InheritOptions): InheritOutput & Api => {
    const reader = next(options)

    const elementZoomer = createElementZoomer(reader)
    const viewportZoomer = createViewportZoomer(reader)
    const currentZoomerSubject$ = new BehaviorSubject<typeof elementZoomer | undefined>(undefined)

    const isUsingScrollableViewport = () => reader.getSettings().computedPageTurnMode === `scrollable`

    const enter = (imgElement?: HTMLImageElement) => {
      currentZoomerSubject$?.value?.exit()

      if (isUsingScrollableViewport()) {
        viewportZoomer.enter()
        currentZoomerSubject$?.next(viewportZoomer)

        return
      }

      if (!imgElement) {
        Report.warn(`You should specify an element to zoom at`)
        return
      }

      elementZoomer.enter(imgElement)
      currentZoomerSubject$?.next(elementZoomer)
    }

    const setCurrentScaleAsBase = () => {
      currentZoomerSubject$.value?.setCurrentScaleAsBase()
    }

    const scale = (userScale: number) => {
      if (!currentZoomerSubject$.value?.isZooming()) {
        Report.warn(`You need to start zoom before being able to call this fn`)
        return
      }

      currentZoomerSubject$.value.scale(userScale)
    }

    const move = (delta: { x: number; y: number } | undefined, options: { isFirst: boolean; isLast: boolean }) => {
      currentZoomerSubject$.value?.move(delta, options)
    }

    const exit = () => {
      currentZoomerSubject$.value?.exit()
    }

    const destroy = () => {
      elementZoomer.destroy()
      viewportZoomer.destroy()
      currentZoomerSubject$.complete()
      reader.destroy()
    }

    return {
      ...reader,
      destroy,
      zoom: {
        enter,
        exit,
        move,
        isZooming: () => currentZoomerSubject$.value?.isZooming() || false,
        getScaleValue: () => currentZoomerSubject$.value?.getScaleValue() || 1,
        scale,
        isUsingScrollableZoom: isUsingScrollableViewport,
        setCurrentScaleAsBase,
        $: {
          isZooming$: currentZoomerSubject$.pipe(switchMap((zoomer) => zoomer?.isZooming$ || of(false))),
        },
      },
    }
  }
