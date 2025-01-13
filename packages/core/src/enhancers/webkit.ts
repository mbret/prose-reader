import { EnhancerOptions, EnhancerOutput, RootEnhancer } from "./types/enhancer"

/**
 * Ideally we want to target all webkit browser but afaik there are no reliable way to do it.
 * We will fix at least safari
 */
const IS_SAFARI =
  navigator.userAgent.indexOf(``) > -1 &&
  navigator.userAgent.indexOf(`Chrome`) <= -1

/**
 * All fixes relative to webkit
 */
export const webkitEnhancer =
  <
    InheritOptions extends EnhancerOptions<RootEnhancer>,
    InheritOutput extends EnhancerOutput<RootEnhancer>,
  >(
    createReader: (options: InheritOptions) => InheritOutput,
  ) =>
  (options: InheritOptions): InheritOutput => {
    const reader = createReader(options)

    /**
     * These hooks are used to fix the flickering on safari that occurs when using transform
     * and more generally GPU transformation. I am not sure what is the impact on performance so
     * we only use them on needed engine (webkit).
     */
    if (IS_SAFARI) {
      // reader.hookManager.register(
      //   "navigator.onBeforeContainerCreated",
      //   ({ element }) => {
      //     element.style.cssText = `
      //     ${element.style.cssText}
      //     -webkit-transform-style: preserve-3d;
      //   `
      //   },
      // )
      // reader.hookManager.register(
      //   "item.onBeforeContainerCreated",
      //   ({ element }) => {
      //     element.style.cssText = `
      //   ${element.style.cssText}
      //   -webkit-transform-style: preserve-3d;
      //   -webkit-backface-visibility: hidden;
      // `
      //   },
      // )
    }

    return reader
  }
