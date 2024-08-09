import { BehaviorSubject, merge, ObservedValueOf, Subject } from "rxjs"
import { Report } from "./report"
import { Context } from "./context/Context"
import { Pagination } from "./pagination/Pagination"
import { HTML_PREFIX } from "./constants"
import {
  takeUntil,
  distinctUntilChanged,
  withLatestFrom,
  map,
  filter,
} from "rxjs/operators"
import { isShallowEqual } from "./utils/objects"
import { createNavigator } from "./navigation/Navigator"
import { createSpineItemLocator as createSpineItemLocator } from "./spineItem/locationResolver"
import { Manifest } from "@prose-reader/shared"
import { isDefined } from "./utils/isDefined"
import { ReaderSettingsManager } from "./settings/ReaderSettingsManager"
import { HookManager } from "./hooks/HookManager"
import { CoreInputSettings } from "./settings/types"
import { PaginationController } from "./pagination/PaginationController"
import { generateCfiFromRange } from "./cfi/generate/generateCfiFromRange"
import { resolveCfi } from "./cfi/lookup/resolveCfi"
import { SpineItemsObserver } from "./spine/SpineItemsObserver"
import { SpineItemsManager } from "./spine/SpineItemsManager"
import { SettingsInterface } from "./settings/SettingsInterface"
import { Spine } from "./spine/Spine"

export type CreateReaderOptions = Partial<CoreInputSettings>

export type CreateReaderParameters = CreateReaderOptions

export type ContextSettings = Partial<CoreInputSettings>

export type LoadOptions = {
  cfi?: string | null
  containerElement: HTMLElement
}

export type ReaderInternal = ReturnType<typeof createReader>

export const createReader = (inputSettings: CreateReaderOptions) => {
  const stateSubject$ = new BehaviorSubject<{
    supportedPageTurnAnimation: NonNullable<
      ContextSettings[`pageTurnAnimation`]
    >[]
    supportedPageTurnMode: NonNullable<ContextSettings[`pageTurnMode`]>[]
    supportedPageTurnDirection: NonNullable<
      ContextSettings[`pageTurnDirection`]
    >[]
    supportedComputedPageTurnDirection: NonNullable<
      ContextSettings[`pageTurnDirection`]
    >[]
  }>({
    supportedPageTurnAnimation: [`fade`, `none`, `slide`],
    supportedPageTurnMode: [`controlled`, `scrollable`],
    supportedPageTurnDirection: [`horizontal`, `vertical`],
    supportedComputedPageTurnDirection: [`horizontal`, `vertical`],
  })
  const destroy$ = new Subject<void>()
  const hookManager = new HookManager()
  const context = new Context()
  const settingsManager = new ReaderSettingsManager(inputSettings, context)
  const spineItemsManager = new SpineItemsManager(context, settingsManager)
  const elementSubject$ = new BehaviorSubject<HTMLElement | undefined>(
    undefined,
  )
  const element$ = elementSubject$.pipe(filter(isDefined))
  const spineItemLocator = createSpineItemLocator({
    context,
    settings: settingsManager,
  })
  const pagination = new Pagination(context, spineItemsManager)

  const spine = new Spine(
    element$,
    context,
    pagination,
    spineItemsManager,
    spineItemLocator,
    settingsManager,
    hookManager,
  )

  const spineItemsObserver = new SpineItemsObserver(spineItemsManager)

  const navigator = createNavigator({
    context,
    spineItemsManager,
    spineItemsObserver,
    parentElement$: elementSubject$,
    hookManager,
    spine,
    settings: settingsManager,
  })

  const paginationController = new PaginationController(
    context,
    pagination,
    spineItemsManager,
    spine,
    spineItemLocator,
  )

  // bridge all navigation stream with reader so they can be shared across app
  navigator.viewportState$.subscribe(context.bridgeEvent.viewportStateSubject)
  navigator.navigation$.subscribe(context.bridgeEvent.navigationSubject)
  navigator.isLocked$.subscribe(context.bridgeEvent.navigationIsLockedSubject)
  pagination.pagination$.subscribe(context.bridgeEvent.paginationSubject)

  const layout = () => {
    const containerElement = elementSubject$.getValue()?.parentElement
    const element = elementSubject$.getValue()

    if (!element || !containerElement) throw new Error("Invalid element")

    const dimensions = {
      width: containerElement?.offsetWidth,
      height: containerElement?.offsetHeight,
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

    context.update({
      visibleAreaRect: {
        x: elementRect.x,
        y: elementRect.y,
        width: containerElementEvenWidth,
        height: dimensions.height,
      },
    })

    spine.layout()
  }

  const load = (manifest: Manifest, loadOptions: LoadOptions) => {
    if (context.manifest) {
      Report.warn(`loading a new book is not supported yet`)

      return
    }

    Report.log(`load`, { manifest, loadOptions })

    // @todo hook
    const element = createWrapperElement(loadOptions.containerElement)

    if (
      loadOptions.containerElement !== elementSubject$.getValue()?.parentElement
    ) {
      elementSubject$.next(element)

      loadOptions.containerElement.appendChild(element)
    }

    context.update({
      manifest,
      ...loadOptions,
      forceSinglePageMode: settingsManager.settings.forceSinglePageMode,
    })

    layout()
  }

  merge(context.state$, settingsManager.settings$)
    .pipe(
      map(() => undefined),
      withLatestFrom(context.state$),
      map(([, { hasVerticalWriting }]) => {
        const manifest = context.manifest

        return {
          hasVerticalWriting,
          renditionFlow: manifest?.renditionFlow,
          renditionLayout: manifest?.renditionLayout,
          computedPageTurnMode: settingsManager.settings.computedPageTurnMode,
        }
      }),
      distinctUntilChanged(isShallowEqual),
      map(
        ({
          hasVerticalWriting,
          renditionFlow,
          renditionLayout,
          computedPageTurnMode,
        }): ObservedValueOf<typeof stateSubject$> => {
          return {
            ...stateSubject$.value,
            supportedPageTurnMode:
              renditionFlow === `scrolled-continuous`
                ? [`scrollable`]
                : !context.state.areAllItemsPrePaginated
                  ? [`controlled`]
                  : [`controlled`, `scrollable`],
            supportedPageTurnAnimation:
              renditionFlow === `scrolled-continuous` ||
              computedPageTurnMode === `scrollable`
                ? [`none`]
                : hasVerticalWriting
                  ? [`fade`, `none`]
                  : [`fade`, `none`, `slide`],
            supportedPageTurnDirection:
              computedPageTurnMode === `scrollable`
                ? [`vertical`]
                : renditionLayout === `reflowable`
                  ? [`horizontal`]
                  : [`horizontal`, `vertical`],
          }
        },
      ),
      takeUntil(destroy$),
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
    spineItemsManager.destroy()
    paginationController.destroy()
    settingsManager.destroy()
    pagination.destroy()
    context.destroy()
    navigator.destroy()
    spine.destroy()
    elementSubject$.getValue()?.remove()
    stateSubject$.complete()
    destroy$.next()
    destroy$.complete()
  }

  return {
    context,
    spine,
    hookManager,
    cfi: {
      generateCfiFromRange,
      resolveCfi: (
        params: Omit<Parameters<typeof resolveCfi>[0], "spineItemsManager">,
      ) => resolveCfi({ ...params, spineItemsManager }),
    },
    navigation: {
      viewportFree$: context.bridgeEvent.viewportFree$,
      viewportBusy$: context.bridgeEvent.viewportBusy$,
      // rest safe
      get viewportPosition() {
        return navigator.viewportNavigator.viewportPosition
      },
      getNavigation: navigator.getNavigation.bind(navigator),
      getElement: navigator.getElement.bind(navigator),
      navigate: navigator.navigate.bind(navigator),
      lock: navigator.lock.bind(navigator),
      navigationResolver: navigator.navigationResolver,
    },
    spineItemsObserver,
    spineItemsManager,
    layout,
    load,
    destroy,
    pagination: {
      pagination: pagination.pagination,
      pagination$: pagination.pagination$,
    },
    settings: settingsManager as SettingsInterface<
      NonNullable<(typeof settingsManager)["inputSettings"]>,
      NonNullable<(typeof settingsManager)["outputSettings"]>
    >,
    element$,
    $: {
      state$: stateSubject$.asObservable(),
      /**
       * Dispatched when the reader has loaded a book and is rendering a book.
       * Using navigation API and getting information about current content will
       * have an effect.
       * It can typically be used to hide a loading indicator.
       */
      loadStatus$: context.manifest$.pipe(
        map((manifest) => (manifest ? "ready" : "idle")),
      ),
      destroy$,
    },
  }
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

type Reader = ReturnType<typeof createReader>

export type { Reader }
