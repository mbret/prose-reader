import { Observable } from "rxjs"

export type EnhancerApi = {
  zoom: {
    enter: (imgElement?: HTMLImageElement) => void
    exit: () => void
    moveAt: (position: { x: number; y: number }) => void
    scaleAt: (scale: number) => void
    currentScale: number
    currentPosition: { x: number; y: number }
    zoomContainerElement: HTMLDivElement | undefined
    isZooming$: Observable<boolean>
    isZooming: boolean
  }
}
