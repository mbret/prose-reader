import { Observable } from "rxjs"
import { Enhancer } from "../types"

export type SettingsInput = {}

export type SettingsOutput = Required<SettingsInput>

export type ZoomEnhancer = Enhancer<SettingsInput, {
  zoom: {
    enter: (imgElement?: HTMLImageElement) => void
    exit: () => void
    move: (
      position: { x: number; y: number } | undefined,
      details: { isFirst: boolean; isLast: boolean }
    ) => void
    isZooming: () => boolean
    isUsingScrollableZoom: () => boolean
    getScaleValue: () => number
    scale: (scale: number) => void
    /**
     * Will keep the last scale value as starting base for next scaling.
     * This is useful when you want to keep scaling after the user stop pinching for example
     * This way you can start from lower value while still increasing from the previous scale.
     */
    setCurrentScaleAsBase: () => void
    $: {
      isZooming$: Observable<boolean>
    }
  }
}, SettingsInput, SettingsOutput>

export type ReaderInstance = ReturnType<Parameters<ZoomEnhancer>[0]>
