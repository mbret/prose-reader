import { animationFrameScheduler, Observable, of, scheduled } from "rxjs"
import { distinctUntilChanged, filter, map, switchMap, take, takeUntil, tap } from "rxjs/operators"
import { Enhancer } from "../types"
import { Reader } from "../../reader"
import { createMovingSafePan$ } from "./createMovingSafePan$"

const SHOULD_NOT_LAYOUT = false

export const layoutEnhancer: Enhancer<{
  /**
   * Can be used to let the reader automatically resize.
   * `container`: observe and resize the reader whenever the container resize.
   * `false`: do not automatically resize.
   */
  layoutAutoResize?: `container` | false
}, {}> = (next) => (options) => {
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
    reader.manipulateSpineItems(({ frame }) => {
      if (!hasRedrawn && frame) {
        /* eslint-disable-next-line no-void */
        void (frame.getBoundingClientRect().left)
        hasRedrawn = true
      }

      return SHOULD_NOT_LAYOUT
    })
  })

  // reader.registerHook(``)

  // @todo fix the panstart issue
  // @todo maybe increasing the hammer distance before triggering pan as well
  // reader.registerHook(`item.onLoad`, ({frame}) => {
  //   frame.contentDocument?.body.addEventListener(`contextmenu`, e => {
  //     console.log(`ad`)
  //     e.preventDefault()
  //   })
  // })

  let observer: ResizeObserver | undefined

  if (options.layoutAutoResize === `container`) {
    observer = new ResizeObserver(() => {
      reader?.layout()
    })
    observer.observe(options.containerElement)
  }

  const movingSafePan$ = createMovingSafePan$(reader)

  movingSafePan$.subscribe()

  return {
    ...reader,
    destroy: () => {
      reader.destroy()
      observer?.disconnect()
    }
  }
}
