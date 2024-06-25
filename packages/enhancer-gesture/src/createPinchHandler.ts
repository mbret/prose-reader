import {
  EMPTY,
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

export type PinchEvent =
  | {
      type: "pinchStart"
      event: PointerEvent
      scale: number
    }
  | { type: "pinchMove"; event: PointerEvent; scale: number }
  | { type: "pinchEnd"; event: PointerEvent; scale: number }

function calculateDistance(pointA: PointerEvent, pointB: PointerEvent) {
  const dx = pointA.clientX - pointB.clientX
  const dy = pointA.clientY - pointB.clientY

  return Math.sqrt(dx * dx + dy * dy)
}

export const createPinchHandler = (
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
    // If a panStart start with more than one pointerdown it is a pinch
    filter((pointerDownEvents) => pointerDownEvents.length > 1),
    filter(isDefined),
  )

  const pinchEvent$ = panStart$.pipe(
    switchMap(([firstPointerDown, secondPointerDown]) => {
      if (!firstPointerDown || !secondPointerDown) return EMPTY

      const previousFingerEvents = [firstPointerDown, secondPointerDown]

      const normalizeEvent = (event: PointerEvent): Omit<PinchEvent, "type"> => {
        const normalizedEvent = reader.events.normalizeEventForViewport(event)

        return {
          event: normalizedEvent,
          scale: 1,
        }
      }

      const normalizedFirstPointerDown = reader.events.normalizeEventForViewport(firstPointerDown)
      const normalizedSecondPointerDown = reader.events.normalizeEventForViewport(secondPointerDown)
      const initialDistance = calculateDistance(normalizedFirstPointerDown, normalizedSecondPointerDown)

      const startEvent = {
        type: "pinchStart",
        ...normalizeEvent(normalizedFirstPointerDown),
      } satisfies PinchEvent

      const dragMove$ = pointerMove$.pipe(
        map((moveEvent) => {
          const previousMatchingEvent = previousFingerEvents.find((event) => event.pointerId === moveEvent.pointerId)
          const previousMatchingOtherEvent = previousFingerEvents.find((event) => event !== previousMatchingEvent)

          const newDistance = calculateDistance(moveEvent, previousMatchingOtherEvent ?? moveEvent)
          const scale = newDistance / initialDistance

          return {
            type: "pinchMove",
            ...normalizeEvent(moveEvent),
            scale,
          } satisfies PinchEvent
        }),
        share(),
        takeUntil(pointerUp$),
      )

      const dragEnd$ = dragMove$.pipe(
        switchMap(() =>
          pointerUp$.pipe(
            map((endEvent) => {
              return {
                type: "pinchEnd",
                ...normalizeEvent(endEvent),
              } satisfies PinchEvent
            }),
            first(),
          ),
        ),
      )

      return merge(of(startEvent), dragMove$, dragEnd$)
    }),
    share(),
  )

  return {
    pinchEvent$,
  }
}
