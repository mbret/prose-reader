import { BehaviorSubject, merge, ObservedValueOf, Subject, switchMap } from "rxjs"
import { Report } from "./report"
import { createContext as createBookContext } from "./context"
import { createPagination } from "./pagination"
import { createSpine } from "./spine/createSpine"
import { LoadOptions, Manifest, Reader } from "./types"
import { HTML_PREFIX, __UNSAFE_REFERENCE_ORIGINAL_IFRAME_EVENT_KEY } from "./constants"
import { takeUntil, tap, distinctUntilChanged, withLatestFrom, mapTo, map } from "rxjs/operators"
import { createSelection } from "./selection"
import { createSpineItemManager } from "./spineItemManager"
import { Hook, RegisterHook } from "./types/Hook"
import { isShallowEqual } from "./utils/objects"
import { createViewportNavigator } from "./viewportNavigator/viewportNavigator"
import { createLocationResolver as createSpineItemLocator } from "./spineItem/locationResolver"
import { createLocationResolver as createSpineLocator } from "./spine/locationResolver"
import { createCfiLocator } from "./spine/cfiLocator"
import { AdjustedNavigation, Navigation } from "./viewportNavigator/types"

type Context = ReturnType<typeof createBookContext>
type ContextSettings = Parameters<Context[`setSettings`]>[0]

const IFRAME_EVENT_BRIDGE_ELEMENT_ID = `proseReaderIframeEventBridgeElement`

export type CreateReaderOptions = {
  hooks?: Hook[]
  containerElement: HTMLElement,
} & Pick<
  ContextSettings,
  | `forceSinglePageMode`
  | `pageTurnAnimation`
  | `pageTurnDirection`
  | `pageTurnMode`
  | `navigationSnapThreshold`
>

export const createReader = ({ containerElement, hooks: initialHooks, ...settings }: CreateReaderOptions): Reader => {
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
  const navigationSubject = new Subject<Navigation>()
  const navigationAdjustedSubject = new Subject<AdjustedNavigation>()
  const currentNavigationPositionSubject$ = new BehaviorSubject({ x: 0, y: 0 })
  const viewportStateSubject = new BehaviorSubject<`free` | `busy`>(`free`)
  const context = createBookContext(settings)
  const spineItemManager = createSpineItemManager({ context })
  const pagination = createPagination({ context, spineItemManager })
  const element = createWrapperElement(containerElement)
  const iframeEventBridgeElement = createIframeEventBridgeElement(containerElement)
  const spineItemLocator = createSpineItemLocator({ context })
  const spineLocator = createSpineLocator({ context, spineItemManager, spineItemLocator })
  const cfiLocator = createCfiLocator({ spineItemManager, context, spineItemLocator })

  const navigation$ = navigationSubject.asObservable()

  const spine = createSpine({
    ownerDocument: element.ownerDocument,
    iframeEventBridgeElement,
    context,
    pagination,
    spineItemManager,
    hooks$: hooksSubject$,
    navigation$,
    spineLocator,
    spineItemLocator,
    cfiLocator,
    navigationAdjusted$: navigationAdjustedSubject.asObservable(),
    viewportState$: viewportStateSubject.asObservable(),
    currentNavigationPosition$: currentNavigationPositionSubject$.asObservable()
  })

  const viewportNavigator = createViewportNavigator({
    context,
    pagination,
    spineItemManager,
    parentElement: element,
    cfiLocator,
    spineLocator,
    hooks$: hooksSubject$,
    spine
  })

  containerElement.appendChild(element)
  element.appendChild(iframeEventBridgeElement)

  // bridge all navigation stream with reader so they can be shared across app
  viewportNavigator.$.state$.subscribe(viewportStateSubject)
  viewportNavigator.$.navigation$.subscribe(navigationSubject)
  viewportNavigator.$.navigationAdjustedAfterLayout$.subscribe(navigationAdjustedSubject)
  viewportNavigator.$.currentNavigationPosition$.subscribe(currentNavigationPositionSubject$)

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

    viewportNavigator.layout()
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

    layout()

    if (!loadOptions.cfi) {
      viewportNavigator.goToSpineItem(0, { animate: false })
    } else {
      viewportNavigator.goToCfi(loadOptions.cfi, { animate: false })
    }

    readySubject$.next()
  }

  const registerHook: RegisterHook = (name, fn) => {
    hooksSubject$.next([...hooksSubject$.getValue(), { name, fn } as Hook])
  }

  const manipulateContainer = (cb: (container: HTMLElement) => boolean) => {
    // @todo re-layout based on return
    cb(element)
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

  viewportNavigator.$.navigationAdjustedAfterLayout$
    .pipe(
      switchMap(({ adjustedSpinePosition }) => {
        return spine.adjustPagination(adjustedSpinePosition)
          .pipe(
            takeUntil(navigation$)
          )
      }),
      takeUntil(context.$.destroy$)
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
    hooksSubject$.next([])
    hooksSubject$.complete()
    pagination.destroy()
    context.destroy()
    viewportNavigator.destroy()
    spine.destroy()
    element.remove()
    iframeEventBridgeElement.remove()
    readySubject$.complete()
    stateSubject$.complete()
    selectionSubject$.complete()
    destroy$.next()
    destroy$.complete()
  }

  const reader = {
    context,
    registerHook,
    spine,
    viewportNavigator,
    manipulateSpineItems: spine.manipulateSpineItems,
    manipulateSpineItem: spine.manipulateSpineItem,
    manipulateContainer,
    moveTo: viewportNavigator.moveTo,
    turnLeft: viewportNavigator.turnLeft,
    turnRight: viewportNavigator.turnRight,
    goToPageOfCurrentChapter: viewportNavigator.goToPageOfCurrentChapter,
    goToPage: viewportNavigator.goToPage,
    goToUrl: viewportNavigator.goToUrl,
    goToCfi: viewportNavigator.goToCfi,
    goToSpineItem: viewportNavigator.goToSpineItem,
    getFocusedSpineItemIndex: spineItemManager.getFocusedSpineItemIndex,
    getSpineItem: spineItemManager.get,
    getSpineItems: spineItemManager.getAll,
    getAbsolutePositionOf: spineItemManager.getAbsolutePositionOf,
    getSelection: spine.getSelection,
    isSelecting: spine.isSelecting,
    normalizeEventForViewport: spine.normalizeEventForViewport,
    getCfiMetaInformation: spine.cfiLocator.getCfiMetaInformation,
    resolveCfi: spine.cfiLocator.resolveCfi,
    generateCfi: spine.cfiLocator.generateFromRange,
    locator: spine.locator,
    getCurrentNavigationPosition: viewportNavigator.getCurrentNavigationPosition,
    getCurrentViewportPosition: viewportNavigator.getCurrentViewportPosition,
    layout,
    load,
    destroy,
    setSettings: context.setSettings,
    $: {
      pagination$: pagination.$.info$,
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
      viewportState$: viewportNavigator.$.state$,
      layout$: spine.$.layout$,
      itemsCreated$: spine.$.itemsCreated$,
      itemsBeforeDestroy$: spine.$.itemsBeforeDestroy$,
      itemIsReady$: spineItemManager.$.itemIsReady$,
      destroy$
    },
    __debug: {
      pagination,
      context,
      spineItemManager
    }
  }

  return reader
}

const createWrapperElement = (containerElement: HTMLElement) => {
  const element = containerElement.ownerDocument.createElement(`div`)
  element.style.cssText = `
    background-color: white;
    position: relative;
  `
  element.className = `${HTML_PREFIX}-reader`

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

export {
  Reader
}
