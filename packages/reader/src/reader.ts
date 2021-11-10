import { BehaviorSubject, Subject } from "rxjs"
import { Report } from "./report"
import { createContext as createBookContext } from "./context"
import { createPagination } from "./pagination"
import { createReadingOrderView } from "./readingOrderView/readingOrderView"
import { LoadOptions, Manifest } from "./types"
import { __UNSAFE_REFERENCE_ORIGINAL_IFRAME_EVENT_KEY } from "./constants"
import { takeUntil, tap } from "rxjs/operators"
import { createSelection } from "./selection"
import { createReadingItemManager } from "./readingItemManager"
import { Hook, RegisterHook } from "./types/Hook"

type Context = ReturnType<typeof createBookContext>
type ContextSettings = Parameters<Context[`setSettings`]>[0]

const IFRAME_EVENT_BRIDGE_ELEMENT_ID = `obokuReaderIframeEventBridgeElement`

type CreateReaderOptions = {
  hooks?: Hook[]
  containerElement: HTMLElement,
} & Pick<ContextSettings, `forceSinglePageMode` | `pageTurnAnimation` | `pageTurnDirection` | `pageTurnMode`>

export const createReader = ({ containerElement, hooks: initialHooks, ...settings }: CreateReaderOptions) => {
  const readySubject$ = new Subject<void>()
  const destroy$ = new Subject<void>()
  const selectionSubject$ = new Subject<ReturnType<typeof createSelection> | null>()
  const hooksSubject$ = new BehaviorSubject<Hook[]>(initialHooks || [])
  const context = createBookContext(settings)
  const readingItemManager = createReadingItemManager({ context })
  const pagination = createPagination({ context, readingItemManager })
  const element = createWrapperElement(containerElement)
  const iframeEventBridgeElement = createIframeEventBridgeElement(containerElement)
  let containerManipulationOnDestroyCbList: (() => void)[] = []
  const readingOrderView = createReadingOrderView({
    parentElement: element,
    iframeEventBridgeElement,
    context,
    pagination,
    readingItemManager,
    hooks$: hooksSubject$
  })

  containerElement.appendChild(element)
  element.appendChild(iframeEventBridgeElement)

  const layout = () => {
    const dimensions = {
      width: containerElement.offsetWidth,
      height: containerElement.offsetHeight
    }
    const margin = 0
    const marginTop = 0
    const marginBottom = 0
    const isReflow = true // @todo
    const containerElementWidth = dimensions.width
    const containerElementEvenWidth =
      containerElementWidth % 2 === 0 || isReflow
        ? containerElementWidth
        : containerElementWidth - 1 // @todo careful with the -1, dunno why it's here yet

    element.style.setProperty(`overflow`, `hidden`)
    element.style.height = `${dimensions.height - marginTop - marginBottom}px`
    element.style.width = `${containerElementEvenWidth - 2 * margin}px`

    if (margin > 0 || marginTop > 0 || marginBottom > 0) {
      element.style.margin = `${marginTop}px ${margin}px ${marginBottom}px`
    }
    const elementRect = element.getBoundingClientRect()

    context.setVisibleAreaRect(
      elementRect.x,
      elementRect.y,
      containerElementEvenWidth,
      dimensions.height
    )

    readingOrderView.layout()
  }

  const load = (
    manifest: Manifest,
    loadOptions: LoadOptions = {}
  ) => {
    if (context.getManifest()) {
      Report.warn(`loading a new book is not supported yet`)
      return
    }

    Report.log(`load`, { manifest, loadOptions })

    context.load(manifest, loadOptions)

    // manifest.readingOrder.forEach((_, index) => resourcesManager.cache(index))

    readingOrderView.load()

    layout()

    if (!loadOptions.cfi) {
      readingOrderView.viewportNavigator.goToSpineItem(0, { animate: false })
    } else {
      readingOrderView.viewportNavigator.goToCfi(loadOptions.cfi, { animate: false })
    }

    readySubject$.next()
  }

  const registerHook: RegisterHook = (name, fn) => {
    hooksSubject$.next([...hooksSubject$.getValue(), { name, fn } as Hook])
  }

  const manipulateContainer = (cb: (container: HTMLElement, onDestroy: (onDestroyCb: () => void) => void) => boolean) => {
    const onDestroy = (onDestroyCb: () => void) => {
      containerManipulationOnDestroyCbList.push(onDestroyCb)
    }

    // @todo re-layout based on return
    cb(element, onDestroy)
  }

  readingOrderView.$.$
    .pipe(
      tap(event => {
        if (event.type === `onSelectionChange`) {
          selectionSubject$.next(event.data)
        }
      }),
      takeUntil(destroy$)
    )
    .subscribe()

  /**
   * Free up resources, and dispose the whole reader.
   * You should call this method if you leave the reader.
   *
   * This is not possible to use any of the reader features once it
   * has been destroyed. If you need to open a new book you need to
   * either create a new reader or call `load` with a different manifest
   * instead of destroying it.
   */
  const destroy = () => {
    containerManipulationOnDestroyCbList.forEach(cb => cb())
    containerManipulationOnDestroyCbList = []
    hooksSubject$.next([])
    hooksSubject$.complete()
    context.destroy()
    readingOrderView?.destroy()
    element.remove()
    iframeEventBridgeElement.remove()
    readySubject$.complete()
    selectionSubject$.complete()
    destroy$.next()
    destroy$.complete()
  }

  const reader = {
    innerPagination: pagination,
    context,
    registerHook,
    manipulateReadingItems: readingOrderView.manipulateReadingItems,
    manipulateContainer,
    moveTo: readingOrderView.viewportNavigator.moveTo,
    turnLeft: readingOrderView.viewportNavigator.turnLeft,
    turnRight: readingOrderView.viewportNavigator.turnRight,
    goToPageOfCurrentChapter: readingOrderView.viewportNavigator.goToPageOfCurrentChapter,
    goToPage: readingOrderView.viewportNavigator.goToPage,
    goToUrl: readingOrderView.viewportNavigator.goToUrl,
    goToCfi: readingOrderView.viewportNavigator.goToCfi,
    goToSpineItem: readingOrderView.viewportNavigator.goToSpineItem,
    getFocusedReadingItemIndex: readingItemManager.getFocusedReadingItemIndex,
    getReadingItem: readingItemManager.get,
    getAbsolutePositionOf: readingItemManager.getAbsolutePositionOf,
    getSelection: readingOrderView.getSelection,
    isSelecting: readingOrderView.isSelecting,
    normalizeEventForViewport: readingOrderView.normalizeEventForViewport,
    getCfiMetaInformation: readingOrderView.cfiLocator.getCfiMetaInformation,
    resolveCfi: readingOrderView.cfiLocator.resolveCfi,
    generateCfi: readingOrderView.cfiLocator.generateFromRange,
    locator: readingOrderView.locator,
    getCurrentNavigationPosition: readingOrderView.viewportNavigator.getCurrentNavigationPosition,
    getCurrentViewportPosition: readingOrderView.viewportNavigator.getCurrentViewportPosition,
    setPageTurnAnimation: (pageTurnAnimation: ContextSettings[`pageTurnAnimation`]) => context.setSettings({ pageTurnAnimation }),
    setPageTurnDirection: (pageTurnDirection: ContextSettings[`pageTurnDirection`]) => context.setSettings({ pageTurnDirection }),
    setPageTurnMode: (pageTurnMode: ContextSettings[`pageTurnMode`]) => context.setSettings({ pageTurnMode }),
    layout,
    load,
    destroy,
    $: {
      /**
       * Dispatched when the reader has loaded a book and is displayed a book.
       * Using navigation API and getting information about current content will
       * have an effect.
       * It can typically be used to hide a loading indicator.
       */
      ready$: readySubject$.asObservable(),
      /**
       * Dispatched when a change in selection happens
       */
      selection$: selectionSubject$.asObservable(),
      viewportState$: readingOrderView.$.viewportState$,
      layout$: readingOrderView.$.layout$,
      destroy$
    },
    __debug: {
      pagination,
      context,
      readingOrderView,
      readingItemManager
    } as any // using any because otherwise ts breaks due to too many types to infer
  }

  return reader
}

export type Reader = ReturnType<typeof createReader>

const createWrapperElement = (containerElement: HTMLElement) => {
  const element = containerElement.ownerDocument.createElement(`div`)
  element.id = `BookView`
  element.style.cssText = `
    background-color: white;
    position: relative;
  `

  return element
}

const createIframeEventBridgeElement = (containerElement: HTMLElement) => {
  const iframeEventBridgeElement = containerElement.ownerDocument.createElement(`div`)
  iframeEventBridgeElement.id = IFRAME_EVENT_BRIDGE_ELEMENT_ID
  iframeEventBridgeElement.style.cssText = `
    position: absolute;
    height: 100%;
    width: 100%;
    top: 0;
    left: 0;
    z-index: -1;
  `

  return iframeEventBridgeElement
}
