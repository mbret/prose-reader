import { buffer, debounceTime, filter, first, map, of, share, shareReplay, startWith, switchMap, withLatestFrom, zip } from "rxjs"
import { createContainerEvents } from "./createContainerEvents"
import { createPanHandler } from "./createPanHandler"
import { isDefined } from "reactjrx"
import { Reader } from "@prose-reader/core"

export type TapEvent =
  | { type: "singleTap"; event: MouseEvent | TouchEvent | PointerEvent; x: number; y: number }
  | { type: "doubleTap"; event: MouseEvent | TouchEvent | PointerEvent; x: number; y: number }

export const mapMixedEventToPosition = (event: MouseEvent | TouchEvent) => ({
  x: "changedTouches" in event ? event.changedTouches[0]?.pageX ?? 0 : event.x,
  y: "changedTouches" in event ? event.changedTouches[0]?.pageY ?? 0 : event.y,
})

export const createTapHandler = (
  { pointerDown$, pointerUp$, isDragging$ }: ReturnType<typeof createContainerEvents> & ReturnType<typeof createPanHandler>,
  reader: Reader,
) => {
  const clickThreshold = 200 // Threshold in milliseconds for double click detection

  function isDrag(startEvent: MouseEvent | TouchEvent, endEvent: MouseEvent | TouchEvent) {
    const start = mapMixedEventToPosition(startEvent)
    const end = mapMixedEventToPosition(endEvent)

    // Determines if the movement qualifies as a drag
    return Math.abs(end.x - start.x) > 0 || Math.abs(end.y - start.y) > 0
  }

  // We buffer pointer down until a move or up happens
  // This is the two only case we can safely rely on to stop buffering
  const pointerDownsBufferStop$ = pointerDown$.pipe(switchMap(() => pointerUp$.pipe(first())))

  // We track all pointer up so we can check later if the buffered pointer down
  // were followed by a pointer up
  const latestPointerUp$ = pointerDown$.pipe(
    switchMap((pointerDownEvent) => zip(of(pointerDownEvent), pointerUp$.pipe(first()))),
    startWith([]),
    shareReplay(1),
  )

  const pointerDowns$ = pointerDown$.pipe(buffer(pointerDownsBufferStop$))

  const click$ = pointerDowns$.pipe(
    withLatestFrom(latestPointerUp$),
    // If there are several pointer down it means we have a pinch, not a single tap
    filter(([pointerDownEvents]) => pointerDownEvents.length === 1),
    map(([pointerDownEvents, [, pointerUpEvent]]) => ({
      pointerDownEvent: pointerDownEvents[0],
      pointerUpEvent,
    })),
    share(),
  )

  const clicks$ = click$.pipe(buffer(pointerUp$.pipe(debounceTime(clickThreshold))))

  const singleTapEvent$ = clicks$.pipe(
    withLatestFrom(isDragging$),
    map(([events, isDragging]) => {
      const { pointerDownEvent: startEvent, pointerUpEvent: endEvent } = events[0] ?? {}

      if (!startEvent || !endEvent) return undefined

      return events.length === 1 && !isDragging && !isDrag(startEvent, endEvent) ? startEvent : undefined
    }),
    filter(isDefined),
    map((event) => {
      const normalizedEvent = reader.normalizeEventForViewport(event)

      return {
        type: "singleTap",
        event: normalizedEvent as PointerEvent,
        ...mapMixedEventToPosition(normalizedEvent),
      } satisfies TapEvent
    }),
  )

  const doubleTapEvent$ = clicks$.pipe(
    withLatestFrom(isDragging$),
    map(([events, isDragging]) => {
      const { pointerDownEvent: startEvent } = events[0] ?? {}
      const { pointerUpEvent: endEvent } = events[events.length - 1] ?? {}

      if (!startEvent || !endEvent) return undefined

      return events.length > 1 && !isDragging && !isDrag(startEvent, endEvent) ? startEvent : undefined
    }),
    filter(isDefined),
    map((event) => {
      const normalizedEvent = reader.normalizeEventForViewport(event)

      return {
        type: "doubleTap",
        event: normalizedEvent as PointerEvent,
        ...mapMixedEventToPosition(normalizedEvent),
      } satisfies TapEvent
    }),
  )

  return { singleTapEvent$, doubleTapEvent$ }
}
