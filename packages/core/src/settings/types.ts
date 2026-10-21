import type { Manifest } from "@prose-reader/shared"
import type { Observable } from "rxjs"
import type {
  DocumentRenderer,
  DocumentRendererParams,
} from "../spineItem/renderer/DocumentRenderer"

export type CoreInputSettings = {
  /**
   * Whether two pages share the viewport.
   * - `auto`: when the viewport's orientation and the book's `rendition:spread`
   *   call for it.
   * - `always`: in every orientation.
   * - `never`: one page at a time.
   *
   * The viewport resolves it at each layout, within what the book allows: a
   * book whose `rendition:spread` is `none`, or whose `rendition:flow` is
   * `scrolled-continuous`, is never shown in a spread. What the reader shows is
   * `reader.viewport.value.isSpread`.
   */
  spreadMode: `auto` | `always` | `never`
  pageTurnAnimation: `none` | `fade` | `slide`
  pageTurnAnimationDuration: undefined | number
  pageTurnDirection: `vertical` | `horizontal`
  pageTurnMode: `controlled` | `scrollable`
  snapAnimationDuration: number
  navigationSnapThreshold:
    | { type: "percentage"; value: number }
    | { type: "pixels"; value: number }
  /**
   * Specify how many spine items you want to preload.
   * Useful for pre-paginated where you want the user to have a smooth transition between items.
   *
   * @important
   * Be careful when using this option with reflowable books since it can potentially add some
   * heavy work on the CPU. One reflowable book with several big chapter may slow down your app
   * significantly.
   */
  numberOfAdjacentSpineItemToPreLoad: number
  /**
   * Specify how you want to fetch resources for each spine item.
   * By default the reader will use an HTTP request with the uri provided in the manifest. We encourage
   * you to keep this behavior as it let the browser to optimize requests. Ideally you would serve your
   * content using a service worker or a backend service and the item uri will hit theses endpoints.
   *
   * @example
   * - Web app with back end to serve content
   * - Web app with service worker to serve content via http interceptor
   *
   * If for whatever reason you need a specific behavior for your items you can specify a function.
   * @example
   * - Web app without backend and no service worker
   * - Providing custom font, img, etc with direct import
   *
   * @important
   * A spine item's document reaches its frame by its url only when the item's href is on the page's
   * origin, `getResource` gives a `URL` or nothing for it, and the item is not one the reader wraps
   * in an html page (a JPEG, PNG, WebP or AVIF image, or a plain text file). The frame's `src` is
   * then that url, so the document and the requests it makes go through the network and any service
   * worker.
   *
   * Anything else is fetched and built into a page by the reader, which the frame loads from a blob
   * url. A relative reference in such a page reaches neither the network nor a service worker. The
   * reader swaps in the images, media, scripts and stylesheets the page references, and the fonts
   * those stylesheets declare, from the manifest items they name, and only for an item `getResource`
   * gives a `Response` for. Any other relative reference, such as a stylesheet's background image,
   * does not load. So if you return a `Response` for a document, return one for the assets it
   * references too, or leave `getResource` out and serve the whole book by url from the page's
   * origin, through a backend or a service worker.
   */
  getResource?: (item: Manifest["items"][number]) =>
    | Observable<
        | URL
        | Response
        /**
         * Custom type is here for flexibility but not a default type to support.
         * This can be used internally by enhancers when they have to handle specific
         * resources (eg: pdfjs pages). Enhancers should not handle this resource type
         * if they are not the one creating it.
         */
        | { custom: true; data: unknown }
        | undefined
      >
    | undefined
  getRenderer?: (
    item: Manifest["spineItems"][number],
  ) => undefined | ((props: DocumentRendererParams) => DocumentRenderer)
}

/**
 * Represent the settings that are derived from user settings.
 * Because some of the user settings can sometime be invalid based on some
 * context we need to use the computed one internally.
 * For example if the user decide to use horizontal page turn direction with scrolled content
 * we will overwrite it and force it to vertical (granted we only support vertical).
 */
export type ComputedCoreSettings = {
  /**
   * controlled: viewport will move in a controlled way, moving from one page to another with calculated coordinate
   * scrollable: viewport will use a simple css overflow mecanism and let the user scroll through content
   */
  computedPageTurnMode: CoreInputSettings[`pageTurnMode`]
  computedPageTurnDirection: CoreInputSettings[`pageTurnDirection`]
  computedPageTurnAnimation: CoreInputSettings[`pageTurnAnimation`]
  computedPageTurnAnimationDuration: number
}

export type CoreOutputSettings = CoreInputSettings & ComputedCoreSettings
