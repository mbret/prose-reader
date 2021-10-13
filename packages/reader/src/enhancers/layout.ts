import { animationFrameScheduler, Observable, of, scheduled } from "rxjs"
import { distinctUntilChanged, filter, map, switchMap, take, takeUntil, tap } from "rxjs/operators"
import { Enhancer } from "../createReader"
import { Reader } from "../reader"

const SHOULD_NOT_LAYOUT = false

export const layoutEnhancer: Enhancer<{}> = (next) => (options) => {
  const reader = next(options)

  reader.registerHook(`onViewportOffsetAdjust`, () => {
    let hasRedrawn = false

    /**
     * When adjusting the offset, there is a chance that pointer event being dispatched right after
     * have a wrong `clientX` / `pageX` etc. This is because even if the iframe left value (once requested) is correct,
     * it does not seem to have been correctly taken by the browser when creating the event.
     * What we do here is that after a viewport adjustment we immediately force a reflow on the engine.
     *
     * @example
     * [pointer event] -> clientX = 50, left = 0, translated clientX = 50 (CORRECT)
     * [translate viewport] -> left = +100px
     * [pointer event] -> clientX = ~50, left = -100, translated clientX = ~-50 (INCORRECT)
     * [pointer event] -> clientX = 150, left = -100, translated clientX = 50 (CORRECT)
     *
     * For some reason the engine must be doing some optimization and unfortunately the first pointer event gets the clientX wrong.
     *
     * The bug can be observed by commenting this code, using CPU slowdown and increasing the throttle on the adjustment stream.
     * The bug seems to affect only chrome / firefox. Nor safari.
     *
     * Also we only need to use `getBoundingClientRect` once.
     *
     * @todo
     * Consider creating a bug ticket on both chromium and gecko projects.
     */
    reader.manipulateReadingItems(({ frame }) => {
      if (!hasRedrawn && frame) {
        /* eslint-disable-next-line no-void */
        void (frame.getBoundingClientRect().left)
        hasRedrawn = true
      }

      return SHOULD_NOT_LAYOUT
    })
  })

  // @todo fix the panstart issue
  // @todo maybe increasing the hammer distance before triggering pan as well
  // reader.registerHook(`item.onLoad`, ({frame}) => {
  //   frame.contentDocument?.body.addEventListener(`contextmenu`, e => {
  //     console.log(`ad`)
  //     e.preventDefault()
  //   })
  // })

  const movingSafePan$ = createMovingSafePan$(reader)

  movingSafePan$.subscribe()

  return reader
}

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
const createMovingSafePan$ = (reader: Reader) => {
  let iframeOverlayForAnimationsElement: HTMLDivElement | undefined

  reader.manipulateContainer((container, onDestroy) => {
    iframeOverlayForAnimationsElement = container.ownerDocument.createElement(`div`)
    iframeOverlayForAnimationsElement.style.cssText = `
      position: absolute;
      left: 0;
      top: 0;
      width: 100%;
      height: 100%;
      visibility: hidden;
    `
    container.appendChild(iframeOverlayForAnimationsElement)

    onDestroy(() => {
      iframeOverlayForAnimationsElement?.remove()
    })

    return SHOULD_NOT_LAYOUT
  })

  const createResetLock$ = <T>(source: Observable<T>) => scheduled(source, animationFrameScheduler)
    .pipe(
      tap(() => {
        iframeOverlayForAnimationsElement?.style.setProperty(`visibility`, `hidden`)
      })
    )

  const viewportFree$ = reader.$.viewportState$.pipe(filter(data => data === `free`))
  const viewportBusy$ = reader.$.viewportState$.pipe(filter(data => data === `busy`))

  const lockAfterViewportBusy$ = viewportBusy$
    .pipe(
      tap(() => {
        iframeOverlayForAnimationsElement?.style.setProperty(`visibility`, `visible`)
      })
    )

  const resetLockViewportFree$ = createResetLock$(viewportFree$)
    .pipe(
      take(1)
    )

  const pageTurnMode$ = reader.context.$.settings$
    .pipe(
      map(() => reader.context.getSettings().computedPageTurnMode),
      distinctUntilChanged()
    )

  const handleViewportLock$ = pageTurnMode$
    .pipe(
      switchMap((mode) => mode === `controlled`
        ? lockAfterViewportBusy$
          .pipe(
            switchMap(() => resetLockViewportFree$)
          )
        : createResetLock$(of(undefined))
      ),
      takeUntil(reader.$.destroy$)
    )

  return handleViewportLock$
}
