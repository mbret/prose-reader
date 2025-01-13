import type { Manifest } from "@prose-reader/shared"
import type {
  DocumentRenderer,
  DocumentRendererParams,
} from "../spineItem/renderer/DocumentRenderer"
import type { Observable } from "rxjs"

export type CoreInputSettings = {
  forceSinglePageMode: boolean
  pageTurnAnimation: `none` | `fade` | `slide`
  pageTurnAnimationDuration: undefined | number
  pageTurnDirection: `vertical` | `horizontal`
  pageTurnMode: `controlled` | `scrollable`
  snapAnimationDuration: number
  navigationSnapThreshold: number
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
   * Due to a bug in chrome/firefox https://bugs.chromium.org/p/chromium/issues/detail?id=880768 you should avoid
   * having a custom fetch method if you serve your content from service worker. This is because when you set fetchResource
   * the iframe will use `srcdoc` rather than `src`. Due to the bug the http hit for the resources inside the iframe will
   * not pass through the service worker.
   */
  getResource?: (
    item: Manifest["items"][number],
  ) =>
    | Observable<URL | Response | { custom: true; data: unknown } | undefined>
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
