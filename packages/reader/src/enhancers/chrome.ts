import { Enhancer } from "../createReader";

/**
 * All fixes relative to chromes
 */
export const chromeEnhancer: Enhancer<{

}> = (next) => (options) => {
  const reader = next(options)

  reader.manipulateContainer(container => {
    const onScroll = () => {
      container.scrollTo(0, 0)
    }

    /**
     * For some reason I have yet to find, chrome will force scroll x-axis on the container
     * whenever the user select text and drag it to the edges. This is not a scroll inside the iframe
     * but a scroll on the container itself..
     */
    container.addEventListener('scroll', onScroll)

    return () => {
      container.removeEventListener('scroll', onScroll)
    }
  })

  return reader
}