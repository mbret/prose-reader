import { Enhancer } from "./types"

/**
 * Ideally we want to target all webkit browser but afaik there are no reliable way to do it.
 * We will fix at least safari
 */
const IS_SAFARI = navigator.userAgent.indexOf(``) > -1 && navigator.userAgent.indexOf(`Chrome`) <= -1

/**
 * All fixes relative to webkit
 */
export const webkitEnhancer: Enhancer<{}, {

}> = (next) => (options) => {
  /**
   * These hooks are used to fix the flickering on safari that occurs when using transform
   * and more generally GPU transformation. I am not sure what is the impact on performance so
   * we only use them on needed engine (webkit).
   */
  const transformFlickerFixHooks: typeof options[`hooks`] = [
    {
      name: `spine.onBeforeContainerCreated`,
      fn: element => {
        element.style.cssText = `
          ${element.style.cssText}
          -webkit-transform-style: preserve-3d;
        `

        return element
      }
    },
    {
      name: `item.onBeforeContainerCreated`,
      fn: element => {
        element.style.cssText = `
          ${element.style.cssText}
          -webkit-transform-style: preserve-3d;
          -webkit-backface-visibility: hidden;
        `

        return element
      }
    }
  ]

  const reader = next({
    ...options,
    ...IS_SAFARI && {
      hooks: [...options.hooks || [], ...transformFlickerFixHooks]
    }
  })

  return reader
}
