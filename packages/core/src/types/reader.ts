import { Observable } from "rxjs"
import { createContext as createBookContext } from "../context"
import { RegisterHook } from "./Hook"
import { Spine } from "./Spine"
import { Pagination, PaginationInfo } from "../pagination"
import { Manifest } from "@prose-reader/shared"
import { SpineItemManager } from "../spineItemManager"
import { ViewportNavigator } from "../viewportNavigator/viewportNavigator"

type Context = ReturnType<typeof createBookContext>

export type ContextSettings = Parameters<Context[`setSettings`]>[0]

export type LoadOptions = {
  cfi?: string
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
  fetchResource?: (item: Manifest[`spineItems`][number]) => Promise<Response>
}

export type ReaderInternal = {
  context: Context
  registerHook: RegisterHook
  spine: Spine
  viewportNavigator: ViewportNavigator
  manipulateSpineItems: Spine["manipulateSpineItems"]
  manipulateSpineItem: Spine["manipulateSpineItem"]
  manipulateContainer: (cb: (container: HTMLElement) => boolean) => void
  moveTo: ViewportNavigator["moveTo"]
  turnLeft: ViewportNavigator["turnLeft"]
  turnRight: ViewportNavigator["turnRight"]
  goToPageOfCurrentChapter: ViewportNavigator["goToPageOfCurrentChapter"]
  goToPage: ViewportNavigator["goToPage"]
  goToUrl: ViewportNavigator["goToUrl"]
  goToCfi: ViewportNavigator["goToCfi"]
  goToSpineItem: ViewportNavigator["goToSpineItem"]
  getFocusedSpineItemIndex: SpineItemManager["getFocusedSpineItemIndex"]
  getSpineItem: SpineItemManager["get"]
  getSpineItems: SpineItemManager["getAll"]
  getAbsolutePositionOf: SpineItemManager["getAbsolutePositionOf"]
  getSelection: Spine["getSelection"]
  isSelecting: Spine["isSelecting"]
  normalizeEventForViewport: Spine['normalizeEventForViewport']
  getCfiMetaInformation: Spine['cfiLocator']['getCfiMetaInformation']
  resolveCfi: Spine['cfiLocator']['resolveCfi']
  generateCfi: Spine['cfiLocator']['generateFromRange']
  locator: Spine['locator']
  getCurrentNavigationPosition: ViewportNavigator['getCurrentNavigationPosition']
  getCurrentViewportPosition: ViewportNavigator['getCurrentViewportPosition']
  layout: () => void
  load: (manifest: Manifest, loadOptions?: LoadOptions) => void
  destroy: () => void
  setSettings: Context["setSettings"]
  settings$: Context["$"]["settings$"]
  /**
   * @important
   * BehaviorSubject
   */
  pagination$: Observable<PaginationInfo>
  spineItems$: Spine["$"]["spineItems$"]
  $: {
    state$: Observable<{
      supportedPageTurnAnimation: NonNullable<ContextSettings[`pageTurnAnimation`]>[]
      supportedPageTurnMode: NonNullable<ContextSettings[`pageTurnMode`]>[]
      supportedPageTurnDirection: NonNullable<ContextSettings[`pageTurnDirection`]>[]
      supportedComputedPageTurnDirection: NonNullable<ContextSettings[`pageTurnDirection`]>[]
    }>
    /**
     * Dispatched when the reader has loaded a book and is displayed a book.
     * Using navigation API and getting information about current content will
     * have an effect.
     * It can typically be used to hide a loading indicator.
     */
    ready$: Observable<void>
    /**
     * Dispatched when a change in selection happens
     */
    selection$: Observable<{
      toString: () => string
      getAnchorCfi: () => string | undefined
      getFocusCfi: () => string | undefined
    } | null>
    viewportState$: Observable<"free" | "busy">
    layout$: Spine["$"]["layout$"]
    itemsBeforeDestroy$: Spine["$"]["itemsBeforeDestroy$"]
    itemIsReady$: SpineItemManager['$']['itemIsReady$']
    destroy$: Observable<void>
  }
  __debug: {
    pagination: Pagination
    context: Context
    spineItemManager: SpineItemManager
  }
}
