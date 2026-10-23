import { filter, fromEvent, switchMap, takeUntil, tap } from "rxjs"
import { setAttributeIfChanged } from "../utils/dom"
import { isDefined } from "../utils/isDefined"
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
     * For some reason I have yet to find, chrome will force scroll x-axis on the container
     * whenever the user select text and drag it to the edges. This is not a scroll inside the iframe
     * but a scroll on the container itself..
     */
    reader.context
      .watch("rootElement")
      .pipe(
        filter(isDefined),
        switchMap((rootElement) =>
          fromEvent(rootElement, `scroll`).pipe(
            tap(() => {
              if (
                reader.settings.values.computedPageTurnMode === `controlled`
              ) {
                rootElement.scrollTo(0, 0)
              }
            }),
          ),
        ),
        takeUntil(reader.$.destroy$),
      )
      .subscribe()

    reader.hookManager.register(`item.onDocumentLoad`, async ({ itemId }) => {
      const item = reader.spineItemsManager.get(itemId)
      const frame = item?.renderer.getDocumentFrame()

      if (!frame) return

      /**
       * Disable touch to search on first text touch / click. This does not prevent
       * it when selecting text. It needs to be turned off by the user.
       * @see https://developers.google.com/web/updates/2015/10/tap-to-search
       */
      if (frame.contentDocument?.body) {
        setAttributeIfChanged(frame.contentDocument.body, `tabindex`, `-1`)
      }
    })

    return reader
  }
