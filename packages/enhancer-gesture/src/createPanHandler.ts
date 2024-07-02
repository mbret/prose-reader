import {
  buffer,
  filter,
  first,
  map,
  merge,
  of,
  share,
  shareReplay,
  startWith,
  switchMap,
  takeUntil,
  withLatestFrom,
  zip,
} from "rxjs"
import { createContainerEvents } from "./createContainerEvents"
import { Reader } from "@prose-reader/core"
import { isDefined } from "reactjrx"

type CommonData = {
  event: PointerEvent
  deltaX: number
  deltaY: number
  // Velocity on the X axis, in px/ms.
  velocityX: number
  // Velocity on the Y axis, in px/ms.
  velocityY: number
  center: { x: number; y: number }
}

export type PanEvent =
  | ({
      type: "panStart"
      /**
       * Delay between the tap and the first moving
       */
      delay: number
    } & CommonData)
  | ({ type: "panMove" } & CommonData)
  | ({ type: "panEnd" } & CommonData)

export const createPanHandler = (
  reader: Reader,
  { pointerMove$, pointerUp$, pointerDown$ }: ReturnType<typeof createContainerEvents>,
) => {
  // We track all pointer up so we can check later if the buffered pointer down
  // were followed by a pointer up
  const latestPointerUp$ = pointerDown$.pipe(
    switchMap((pointerDownEvent) => zip(of(pointerDownEvent), pointerUp$.pipe(first()))),
    startWith([]),
    shareReplay(1),
  )

  // We buffer pointer down until a move or up happens
  // This is the two only case we can safely rely on to stop buffering
  const pointerDownsBufferStop$ = pointerDown$.pipe(switchMap(() => merge(pointerMove$, pointerUp$).pipe(first())))

  // We buffer all pointer down until a move or up happens
  // this help us detect how many fingers were used
  const pointerDownBuffer$ = pointerDown$.pipe(buffer(pointerDownsBufferStop$))

  const panStart$ = pointerDownBuffer$.pipe(
    withLatestFrom(latestPointerUp$),
    // because we buffer pointer down until a move or up happens, we need
    // to discard them if a pointer up happened
    filter(
      ([pointerDownEvents, [latestPointerDownFollowedByUp]]) =>
        !pointerDownEvents.find((event) => event === latestPointerDownFollowedByUp),
    ),
    map(([pointerDownEvents]) => pointerDownEvents),
    // If a panStart start with more than one pointerdown it is not a pan but a pinch
    filter((pointerDownEvents) => pointerDownEvents.length === 1),
    map((events) => events[0]),
    filter(isDefined),
  )

  const dragEvent$ = panStart$.pipe(
    switchMap((startPointerDownEvent) => {
      const normalizedStartPointerDownEvent = reader.events.normalizeEventForViewport(startPointerDownEvent)

      const startTime = new Date().getTime()
      const startX = normalizedStartPointerDownEvent.clientX
      const startY = normalizedStartPointerDownEvent.clientY

      const normalizeEvent = (event: PointerEvent): Omit<PanEvent, "type"> => {
        const normalizedEvent = reader.events.normalizeEventForViewport(event)

        const deltaX = normalizedEvent.clientX - startX
        const deltaY = normalizedEvent.clientY - startY

        // Calculate the change in time
        const dt = Date.now() - startTime

        // Avoid division by zero
        // Calculate velocity in pixels per second
        const velocityX = dt > 0 ? deltaX / dt : 0
        const velocityY = dt > 0 ? deltaY / dt : 0

        return {
          event: normalizedEvent,
          deltaX,
          deltaY,
          velocityX,
          velocityY,
          center: {
            x: normalizedEvent.x,
            y: normalizedEvent.y,
          },
        }
      }

      const dragStartEvent = {
        type: "panStart",
        ...normalizeEvent(startPointerDownEvent),
        delay: new Date().getTime() - startTime,
      } satisfies PanEvent

      const dragMove$ = pointerMove$.pipe(
        map((moveEvent) => {
          return {
            type: "panMove",
            ...normalizeEvent(moveEvent),
          } satisfies PanEvent
        }),
        share(),
        takeUntil(pointerUp$),
      )

      const dragEnd$ = dragMove$.pipe(
        switchMap(() =>
          pointerUp$.pipe(
            map((endEvent) => {
              return {
                type: "panEnd",
                ...normalizeEvent(endEvent),
              } satisfies PanEvent
            }),
            first(),
          ),
        ),
      )

      return merge(of(dragStartEvent), dragMove$, dragEnd$)
    }),
    share(),
  )

  const isDragging$ = dragEvent$.pipe(
    map(({ type }) => type === "panMove"),
    startWith(false),
    shareReplay(1),
  )

  return {
    isDragging$,
    dragEvent$,
  }
}
