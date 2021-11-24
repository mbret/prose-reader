import { BehaviorSubject, merge, ObservedValueOf, Subject } from "rxjs"
import { Report } from "./report"
import { createContext as createBookContext } from "./context"
import { createPagination } from "./pagination"
import { createSpine } from "./spine/createSpine"
import { LoadOptions, Manifest } from "./types"
import { __UNSAFE_REFERENCE_ORIGINAL_IFRAME_EVENT_KEY } from "./constants"
import { takeUntil, tap, distinctUntilChanged, withLatestFrom, mapTo, map } from "rxjs/operators"
import { createSelection } from "./selection"
import { createSpineItemManager } from "./spineItemManager"
import { Hook, RegisterHook } from "./types/Hook"
import { isShallowEqual } from "./utils/objects"

type Context = ReturnType<typeof createBookContext>
type ContextSettings = Parameters<Context[`setSettings`]>[0]

const IFRAME_EVENT_BRIDGE_ELEMENT_ID = `obokuReaderIframeEventBridgeElement`

type CreateReaderOptions = {
  hooks?: Hook[]
  containerElement: HTMLElement,
} & Pick<ContextSettings, `forceSinglePageMode` | `pageTurnAnimation` | `pageTurnDirection` | `pageTurnMode`>

export const createReader = ({ containerElement, hooks: initialHooks, ...settings }: CreateReaderOptions) => {
  const stateSubject$ = new BehaviorSubject<{
    supportedPageTurnAnimation: NonNullable<ContextSettings[`pageTurnAnimation`]>[]
    supportedPageTurnMode: NonNullable<ContextSettings[`pageTurnMode`]>[]
    supportedPageTurnDirection: NonNullable<ContextSettings[`pageTurnDirection`]>[]
    supportedComputedPageTurnDirection: NonNullable<ContextSettings[`pageTurnDirection`]>[]
  }>({
    supportedPageTurnAnimation: [`fade`, `none`, `slide`],
    supportedPageTurnMode: [`controlled`, `scrollable`],
    supportedPageTurnDirection: [`horizontal`, `vertical`],
    supportedComputedPageTurnDirection: [`horizontal`, `vertical`]
  })
  const readySubject$ = new Subject<void>()
  const destroy$ = new Subject<void>()
  const selectionSubject$ = new Subject<ReturnType<typeof createSelection> | null>()
  const hooksSubject$ = new BehaviorSubject<Hook[]>(initialHooks || [])
  const context = createBookContext(settings)
  const spineItemManager = createSpineItemManager({ context })
  const pagination = createPagination({ context, spineItemManager })
  const element = createWrapperElement(containerElement)
  const iframeEventBridgeElement = createIframeEventBridgeElement(containerElement)
  let containerManipulationOnDestroyCbList: (() => void)[] = []
  const spine = createSpine({
    parentElement: element,
    iframeEventBridgeElement,
    context,
    pagination,
    spineItemManager,
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

    spine.layout()
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

    spine.load()

    layout()

    if (!loadOptions.cfi) {
      spine.viewportNavigator.goToSpineItem(0, { animate: false })
    } else {
      spine.viewportNavigator.goToCfi(loadOptions.cfi, { animate: false })
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

  spine.$.$
    .pipe(
      tap(event => {
        if (event.type === `onSelectionChange`) {
          selectionSubject$.next(event.data)
        }
      }),
      takeUntil(destroy$)
    )
    .subscribe()

  merge(
    context.$.load$,
    context.$.settings$,
    context.$.hasVerticalWriting$
  )
    .pipe(
      mapTo(undefined),
      withLatestFrom(context.$.hasVerticalWriting$),
      map(([, hasVerticalWriting]) => {
        const settings = context.getSettings()
        const manifest = context.getManifest()

        return {
          hasVerticalWriting,
          renditionFlow: manifest?.renditionFlow,
          renditionLayout: manifest?.renditionLayout,
          computedPageTurnMode: settings.computedPageTurnMode
        }
      }),
      distinctUntilChanged(isShallowEqual),
      map(({ hasVerticalWriting, renditionFlow, renditionLayout, computedPageTurnMode }): ObservedValueOf<typeof stateSubject$> => ({
        ...stateSubject$.value,
        supportedPageTurnMode:
          renditionFlow === `scrolled-continuous`
            ? [`scrollable`]
            : !context.areAllItemsPrePaginated() ? [`controlled`] : [`controlled`, `scrollable`],
        supportedPageTurnAnimation:
          renditionFlow === `scrolled-continuous` || computedPageTurnMode === `scrollable`
            ? [`none`]
            : hasVerticalWriting
              ? [`fade`, `none`]
              : [`fade`, `none`, `slide`],
        supportedPageTurnDirection:
          computedPageTurnMode === `scrollable`
            ? [`vertical`]
            : renditionLayout === `reflowable`
              ? [`horizontal`]
              : [`horizontal`, `vertical`]
      })),
      takeUntil(destroy$)
    )
    .subscribe(stateSubject$)

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
    spine?.destroy()
    element.remove()
    iframeEventBridgeElement.remove()
    readySubject$.complete()
    stateSubject$.complete()
    selectionSubject$.complete()
    destroy$.next()
    destroy$.complete()
  }

  const reader = {
    innerPagination: pagination,
    context,
    registerHook,
    manipulateSpineItems: spine.manipulateSpineItems,
    manipulateContainer,
    moveTo: spine.viewportNavigator.moveTo,
    turnLeft: spine.viewportNavigator.turnLeft,
    turnRight: spine.viewportNavigator.turnRight,
    goToPageOfCurrentChapter: spine.viewportNavigator.goToPageOfCurrentChapter,
    goToPage: spine.viewportNavigator.goToPage,
    goToUrl: spine.viewportNavigator.goToUrl,
    goToCfi: spine.viewportNavigator.goToCfi,
    goToSpineItem: spine.viewportNavigator.goToSpineItem,
    getFocusedSpineItemIndex: spineItemManager.getFocusedSpineItemIndex,
    getSpineItem: spineItemManager.get,
    getAbsolutePositionOf: spineItemManager.getAbsolutePositionOf,
    getSelection: spine.getSelection,
    isSelecting: spine.isSelecting,
    normalizeEventForViewport: spine.normalizeEventForViewport,
    getCfiMetaInformation: spine.cfiLocator.getCfiMetaInformation,
    resolveCfi: spine.cfiLocator.resolveCfi,
    generateCfi: spine.cfiLocator.generateFromRange,
    locator: spine.locator,
    getCurrentNavigationPosition: spine.viewportNavigator.getCurrentNavigationPosition,
    getCurrentViewportPosition: spine.viewportNavigator.getCurrentViewportPosition,
    layout,
    load,
    destroy,
    setSettings: context.setSettings,
    $: {
      settings$: context.$.settings$,
      state$: stateSubject$.asObservable(),
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
      viewportState$: spine.$.viewportState$,
      layout$: spine.$.layout$,
      destroy$
    },
    __debug: {
      pagination,
      context,
      spine,
      spineItemManager
    } as any // using any because otherwise ts breaks due to too many types to infer
  }

  return reader
}

export type Reader = ReturnType<typeof createReader>

const createWrapperElement = (containerElement: HTMLElement) => {
  const element = containerElement.ownerDocument.createElement(`div`)
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
