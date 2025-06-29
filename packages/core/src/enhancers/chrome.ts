import { takeUntil } from "rxjs"
import type { EnhancerOutput, RootEnhancer } from "./types/enhancer"

/**
 * All fixes relative to chromes
 */
export const chromeEnhancer =
  <InheritOptions, InheritOutput extends EnhancerOutput<RootEnhancer>>(
    next: (options: InheritOptions) => InheritOutput,
  ) =>
  (options: InheritOptions): InheritOutput => {
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

    reader.context.state$
      .pipe(takeUntil(reader.$.destroy$))
      .subscribe(({ rootElement }) => {
        if (!rootElement) return

        const onScroll = () => {
          if (reader.settings.values.computedPageTurnMode === `controlled`) {
            rootElement.scrollTo(0, 0)
          }
        }

        /**
         * For some reason I have yet to find, chrome will force scroll x-axis on the container
         * whenever the user select text and drag it to the edges. This is not a scroll inside the iframe
         * but a scroll on the container itself..
         */
        rootElement.addEventListener(`scroll`, onScroll)
      })

    reader.hookManager.register(`item.onDocumentLoad`, ({ itemId }) => {
      const item = reader.spineItemsManager.get(itemId)
      const frame = item?.renderer.getDocumentFrame()

      if (!frame) return

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
