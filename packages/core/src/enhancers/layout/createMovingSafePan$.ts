import {
  NEVER,
  Observable,
  animationFrameScheduler,
  merge,
  of,
  scheduled,
} from "rxjs"
import {
  distinctUntilChanged,
  map,
  switchMap,
  take,
  takeUntil,
  tap,
} from "rxjs/operators"
import type { Reader } from "../../reader"

/**
 * For some reason (bug / expected / engine layout optimization) when the viewport is being animated clicking inside iframe
 * sometimes returns invalid clientX value. This means that when rapidly (or not) clicking during animation on iframe will often
 * time returns invalid value. In order to reduce potential unwanted behavior on consumer side, we temporarily hide the iframe behind
 * an overlay. That way the overlay take over for the pointer event and we all good.
 *
 * @important
 * This obviously block any interaction with iframe but there should not be such interaction with iframe in theory.
 * Theoretically if user decide to interact during the animation that's either to stop it or swipe the pages.
 */
export const createMovingSafePan$ = (reader: Reader) => {
  let iframeOverlayForAnimationsElement: HTMLDivElement | undefined

  const updateOverlayElement$ = reader.context.state$.pipe(
    switchMap(({ containerElement }) => {
      if (!containerElement) return NEVER

      return new Observable(() => {
        iframeOverlayForAnimationsElement =
          containerElement.ownerDocument.createElement(`div`)
        iframeOverlayForAnimationsElement.style.cssText = `
        position: absolute;
        left: 0;
        top: 0;
        width: 100%;
        height: 100%;
        visibility: hidden;
      `
        containerElement.appendChild(iframeOverlayForAnimationsElement)

        return () => {
          iframeOverlayForAnimationsElement?.remove()
          iframeOverlayForAnimationsElement = undefined
        }
      })
    }),
  )

  const createResetLock$ = <T>(source: Observable<T>) =>
    scheduled(source, animationFrameScheduler).pipe(
      tap(() => {
        iframeOverlayForAnimationsElement?.style.setProperty(
          `visibility`,
          `hidden`,
        )
      }),
    )

  const lockAfterViewportBusy$ = reader.context.bridgeEvent.viewportBusy$.pipe(
    tap(() => {
      iframeOverlayForAnimationsElement?.style.setProperty(
        `visibility`,
        `visible`,
      )
    }),
  )

  const resetLockViewportFree$ = createResetLock$(reader.viewportFree$).pipe(
    take(1),
  )

  const pageTurnMode$ = reader.settings.values$.pipe(
    map(() => reader.settings.values.computedPageTurnMode),
    distinctUntilChanged(),
  )

  const handleViewportLock$ = pageTurnMode$.pipe(
    switchMap((mode) =>
      mode === `controlled`
        ? lockAfterViewportBusy$.pipe(switchMap(() => resetLockViewportFree$))
        : createResetLock$(of(undefined)),
    ),
    takeUntil(reader.$.destroy$),
  )

  return merge(updateOverlayElement$, handleViewportLock$)
}
