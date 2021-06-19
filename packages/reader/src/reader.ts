import { Subject, Subscription } from "rxjs";
import { Report } from "./report";
import { createContext as createBookContext } from "./context";
import { createPagination } from "./pagination";
import { createReadingOrderView } from "./readingOrderView/readingOrderView";
import { LoadOptions, Manifest } from "./types";
import { __UNSAFE_REFERENCE_ORIGINAL_IFRAME_EVENT_KEY } from "./constants";
import { takeUntil, tap } from "rxjs/operators";
import { createSelection } from "./selection";

type ReadingOrderView = ReturnType<typeof createReadingOrderView>

export type Reader = ReturnType<typeof createReader>

const READING_ITEM_ON_LOAD_HOOK = 'readingItem.onLoad'
const READING_ITEM_ON_CREATED_HOOK = 'readingItem.onCreated'
const IFRAME_EVENT_BRIDGE_ELEMENT_ID = `obokuReaderIframeEventBridgeElement`

type ReadingOrderViewHook = Parameters<ReadingOrderView['registerHook']>[0]
type ManipulateReadingItemsCallback = Parameters<ReadingOrderView['manipulateReadingItems']>[0]

type Hooks = {
  [READING_ITEM_ON_LOAD_HOOK]: Extract<ReadingOrderViewHook, { name: 'readingItem.onLoad' }>
  [READING_ITEM_ON_CREATED_HOOK]: Extract<ReadingOrderViewHook, { name: 'readingItem.onCreated' }>
}

type Event =
  { type: 'iframe', data: HTMLIFrameElement }
  | { type: 'ready' }
  | { type: `layoutUpdate` }
  | { type: `onSelectionChange`, data: ReturnType<typeof createSelection> | null }
  | { type: `onNavigationChange` }

export const createReader = ({ containerElement, ...settings }: {
  containerElement: HTMLElement,
  forceSinglePageMode?: boolean
}) => {
  const subject = new Subject<Event>()
  const destroy$ = new Subject<void>()
  const paginationSubject = new Subject<{ event: 'change' }>()
  const context = createBookContext(settings)
  const pagination = createPagination({ context })
  const element = createWrapperElement(containerElement)
  const iframeEventBridgeElement = createIframeEventBridgeElement(containerElement)
  let containerManipulationOnDestroyCbList: (() => void)[] = []
  const readingOrderView = createReadingOrderView({
    containerElement: element,
    iframeEventBridgeElement,
    context,
    pagination,
  })
  let paginationSubscription: Subscription | undefined

  containerElement.appendChild(element)
  element.appendChild(iframeEventBridgeElement)

  const layout = () => {
    const dimensions = {
      width: containerElement.offsetWidth,
      height: containerElement.offsetHeight,
    }
    let margin = 0
    let marginTop = 0
    let marginBottom = 0
    let isReflow = true // @todo
    const containerElementWidth = dimensions.width
    const containerElementEvenWidth =
      containerElementWidth % 2 === 0 || isReflow
        ? containerElementWidth
        : containerElementWidth - 1 // @todo careful with the -1, dunno why it's here yet

    element.style.width = `${containerElementEvenWidth - 2 * margin}px`
    element.style.height = `${dimensions.height - marginTop - marginBottom}px`
    if (margin > 0 || marginTop > 0 || marginBottom > 0) {
      element.style.margin = `${marginTop}px ${margin}px ${marginBottom}px`
    }
    const elementRect = element.getBoundingClientRect()

    context?.setVisibleAreaRect(
      elementRect.x,
      elementRect.y,
      containerElementEvenWidth,
      dimensions.height
    )

    readingOrderView?.layout()
  }

  const load = (
    manifest: Manifest,
    loadOptions: LoadOptions = {
      fetchResource: `http`,
    },
  ) => {
    if (context.getManifest()) {
      Report.warn(`loading a new book is not supported yet`)
      return
    }

    Report.log(`load`, { manifest, loadOptions })

    context.load(manifest, loadOptions)
    readingOrderView.load()

    layout()

    if (!loadOptions.cfi) {
      readingOrderView.goToSpineItem(0)
    } else {
      readingOrderView.goToCfi(loadOptions.cfi)
    }

    paginationSubscription?.unsubscribe()
    paginationSubscription = pagination.$.subscribe(paginationSubject)

    subject.next({ type: 'ready' })
  }

  function registerHook(name: typeof READING_ITEM_ON_LOAD_HOOK, fn: Hooks[typeof READING_ITEM_ON_LOAD_HOOK]['fn']): void
  function registerHook(name: typeof READING_ITEM_ON_CREATED_HOOK, fn: Hooks[typeof READING_ITEM_ON_CREATED_HOOK]['fn']): void
  function registerHook(name: string, fn: any) {
    const validHooks = [READING_ITEM_ON_LOAD_HOOK, READING_ITEM_ON_CREATED_HOOK] as const
    if (validHooks.includes(name as typeof validHooks[number])) {
      readingOrderView.registerHook({ name: name as typeof validHooks[number] , fn })
    }
  }

  const manipulateReadingItems = (cb: ManipulateReadingItemsCallback) => {
    readingOrderView.manipulateReadingItems(cb)
  }

  const manipulateContainer = (cb: (container: HTMLElement, onDestroy: (onDestroyCb: () => void) => void) => boolean) => {
    const onDestroy = (onDestroyCb: () => void) => {
      containerManipulationOnDestroyCbList.push(onDestroyCb)
    }

    // @todo re-layout based on return
    cb(element, onDestroy)
  }

  readingOrderView.$
    .pipe(
      tap(event => subject.next(event)),
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
    paginationSubscription?.unsubscribe()
    context.destroy()
    readingOrderView?.destroy()
    element.remove()
    iframeEventBridgeElement.remove()
    destroy$.next()
    destroy$.complete()
  }

  const reader = {
    pagination,
    context,
    registerHook,
    manipulateReadingItems,
    manipulateContainer,
    moveTo: readingOrderView.moveTo,
    turnLeft: readingOrderView.turnLeft,
    turnRight: readingOrderView.turnRight,
    goToPageOfCurrentChapter: readingOrderView.goToPageOfCurrentChapter,
    goTo: readingOrderView.goTo,
    goToUrl: readingOrderView.goToUrl,
    getChapterInfo: readingOrderView.getChapterInfo,
    getFocusedReadingItemIndex: readingOrderView.getFocusedReadingItemIndex,
    getReadingItem: readingOrderView.getReadingItem,
    getSelection: readingOrderView.getSelection,
    isSelecting: readingOrderView.isSelecting,
    normalizeEvent: readingOrderView.normalizeEvent,
    getCfiMetaInformation: readingOrderView.getCfiMetaInformation,
    resolveCfi: readingOrderView.resolveCfi,
    locator: readingOrderView.locator,
    getCurrentPosition: readingOrderView.getCurrentPosition,
    layout,
    load,
    destroy,
    pagination$: paginationSubject.asObservable(),
    $: subject.asObservable(),
    destroy$,
    __debug: {
      pagination,
      context,
      readingOrderView,
    }
  }

  return reader
}

const createWrapperElement = (containerElement: HTMLElement) => {
  const element = containerElement.ownerDocument.createElement('div')
  element.id = 'BookView'
  element.style.setProperty(`overflow`, `hidden`)
  element.style.setProperty(`position`, `relative`)

  return element
}

const createIframeEventBridgeElement = (containerElement: HTMLElement) => {
  const iframeEventBridgeElement = containerElement.ownerDocument.createElement('div')
  iframeEventBridgeElement.id = IFRAME_EVENT_BRIDGE_ELEMENT_ID
  iframeEventBridgeElement.style.cssText = `
    position: absolute;
    height: 100%;
    width: 100%;
  `

  return iframeEventBridgeElement
}