import { Reader } from "@prose-reader/core"
import { fromEvent, switchMap } from "rxjs"

export const createContainerEvents = (reader: Reader) => {
  const mouseDown$ = reader.context.containerElement$.pipe(
    switchMap((container) => fromEvent<MouseEvent>(container, "mousedown")),
  )
  const mouseUp$ = reader.context.containerElement$.pipe(switchMap((container) => fromEvent<MouseEvent>(container, "mouseup")))
  const mouseMove$ = reader.context.containerElement$.pipe(
    switchMap((container) => fromEvent<MouseEvent>(container, "mousemove")),
  )
  const touchStart$ = reader.context.containerElement$.pipe(
    switchMap((container) => fromEvent<TouchEvent>(container, "touchstart")),
  )
  const touchEnd$ = reader.context.containerElement$.pipe(switchMap((container) => fromEvent<TouchEvent>(container, "touchend")))
  const touchMove$ = reader.context.containerElement$.pipe(
    switchMap((container) => fromEvent<TouchEvent>(container, "touchmove")),
  )
  const pointerDown$ = reader.context.containerElement$.pipe(
    switchMap((container) => fromEvent<PointerEvent>(container, "pointerdown")),
  )
  const pointerMove$ = reader.context.containerElement$.pipe(
    switchMap((container) => fromEvent<PointerEvent>(container, "pointermove")),
  )
  const pointerUp$ = reader.context.containerElement$.pipe(
    switchMap((container) => fromEvent<PointerEvent>(container, "pointerup")),
  )

  return {
    mouseDown$,
    mouseUp$,
    mouseMove$,
    touchStart$,
    touchEnd$,
    touchMove$,
    pointerUp$,
    pointerMove$,
    pointerDown$,
  }
}
