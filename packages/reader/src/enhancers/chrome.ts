import { Enhancer } from "./types"

const SHOULD_NOT_LAYOUT = false

/**
 * All fixes relative to chromes
 */
export const chromeEnhancer: Enhancer<{}, {

}> = (next) => (options) => {
  const reader = next(options)

  /**
   * This element is used to force a refresh of a screen in order to fix the
   * frozen screen that happens with chrome.
   * The bug is weird and I have yet to explain it correctly, what happens
   * is that sometime when moving the x-axis on navigation, the screen will still display
   * the old screen, as if it was frozen. Generally any interaction with the page will unfreeze
   * the screen and the new iframe will be displayed. It also happens within the same iframe.
   * So far it seems to be due to scaling and x-axis moving.
   * To ensure the screen does not freeze we are moving a 1:1 square in & out of the screen.
   * That way chrome is "forced" to refresh the screen.
   *
   * @todo
   * check https://developer.mozilla.org/en-US/docs/Web/CSS/will-change with will-change: transform
   * to see if it does refresh all the time itself.
   *
   * @todo
   * use transform and translate rather than changing top so it only affect composite layer rather than paint
   * @see https://www.algolia.com/blog/engineering/performant-web-animations/
   *
   * @important
   * This is disabled for now as removing will-change on container seems to fix the issue
   */
  // let screenForceRefreshElt: HTMLDivElement | undefined = undefined

  reader.manipulateContainer((container) => {
    const onScroll = () => {
      if (reader.context.getSettings().computedPageTurnMode === `controlled`) {
        container.scrollTo(0, 0)
      }
    }

    /**
     * For some reason I have yet to find, chrome will force scroll x-axis on the container
     * whenever the user select text and drag it to the edges. This is not a scroll inside the iframe
     * but a scroll on the container itself..
     */
    container.addEventListener(`scroll`, onScroll)

    // screenForceRefreshElt = container.ownerDocument.createElement('div')
    // screenForceRefreshElt.style.cssText = `
    //   position: absolute;
    //   background-color: black;
    //   left: 0;
    //   top: -1px;
    //   width: 1px;
    //   height: 1px;
    // `

    // container.appendChild(screenForceRefreshElt)

    return SHOULD_NOT_LAYOUT
  })

  reader.registerHook(`item.onLoad`, ({ frame }) => {
    /**
     * Disable touch to search on first text touch / click. This does not prevent
     * it when selecting text. It needs to be turned off by the user.
     * @see https://developers.google.com/web/updates/2015/10/tap-to-search
     */
    frame.contentDocument?.body.setAttribute(`tabindex`, `-1`)
  })

  // const forceScreenRefresh$ = reader.$.$
  //   .pipe(
  //     // filter(event => event.type === `onNavigationChange`),
  //     tap(() => {
  //       // screenForceRefreshElt?.style.setProperty(`top`, `0px`)
  //       // requestAnimationFrame(() => {
  //       //   screenForceRefreshElt?.style.setProperty(`top`, `-1px`)
  //       // })
  //     })
  //   )

  // merge(forceScreenRefresh$)
  //   .pipe(takeUntil(reader.$.destroy$))
  //   .subscribe()

  return reader
}
