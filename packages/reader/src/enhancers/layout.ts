import { Enhancer } from "../createReader";

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
     * For some reason the engine must be doing some optimization and unfortunately the first pointer even gets the clientX wrong.
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
        void (frame.getBoundingClientRect().left)
        hasRedrawn = true
      }

      return SHOULD_NOT_LAYOUT
    })
  })

  return reader
}