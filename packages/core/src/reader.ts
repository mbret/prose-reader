import { BehaviorSubject, type ObservedValueOf, Subject, merge } from "rxjs"
import {
  distinctUntilChanged,
  filter,
  map,
  takeUntil,
  withLatestFrom,
} from "rxjs/operators"
import { generateCfiForSpineItemPage } from "./cfi/generate/generateCfiForSpineItemPage"
import { generateCfiFromRange } from "./cfi/generate/generateCfiFromRange"
import { generateCfiFromSelection } from "./cfi/generate/generateCfiFronSelection"
import { parseCfi } from "./cfi/lookup/parseCfi"
import { resolveCfi } from "./cfi/lookup/resolveCfi"
import { HTML_PREFIX } from "./constants"
import { Context, type ContextState } from "./context/Context"
import { HookManager } from "./hooks/HookManager"
import { createNavigator } from "./navigation/Navigator"
import { Pagination } from "./pagination/Pagination"
import { PaginationController } from "./pagination/PaginationController"
import { Report } from "./report"
import { ReaderSettingsManager } from "./settings/ReaderSettingsManager"
import type { SettingsInterface } from "./settings/SettingsInterface"
import type { CoreInputSettings } from "./settings/types"
import { Spine } from "./spine/Spine"
import { SpineItemsManager } from "./spine/SpineItemsManager"
import type { SpineItem } from "./spineItem/SpineItem"
import { createSpineItemLocator } from "./spineItem/locationResolver"
import { isDefined } from "./utils/isDefined"
import { isShallowEqual } from "./utils/objects"
import { Viewport } from "./viewport/Viewport"

export type CreateReaderOptions = Partial<CoreInputSettings>

export type CreateReaderParameters = CreateReaderOptions

export type ContextSettings = Partial<CoreInputSettings>

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
  const viewport = new Viewport(context)
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
    viewport,
  )

  const navigator = createNavigator({
    context,
    spineItemsManager,
    parentElement$: elementSubject$,
    hookManager,
    spine,
    settings: settingsManager,
    viewport,
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
  pagination.state$.subscribe(context.bridgeEvent.paginationSubject)

  const layout = () => {
    const containerElement = elementSubject$.getValue()?.parentElement
    const element = elementSubject$.getValue()

    if (!element || !containerElement) return

    const dimensions = {
      width: containerElement?.offsetWidth,
      height: containerElement?.offsetHeight,
    }
    const margin = 0
    const marginTop = 0
    const marginBottom = 0

    element.style.setProperty(`overflow`, `hidden`)
    element.style.height = `${dimensions.height - marginTop - marginBottom}px`
    element.style.width = `${dimensions.width - 2 * margin}px`

    if (margin > 0 || marginTop > 0 || marginBottom > 0) {
      element.style.margin = `${marginTop}px ${margin}px ${marginBottom}px`
    }
    const elementRect = element.getBoundingClientRect()

    context.update({
      visibleAreaRect: {
        x: elementRect.x,
        y: elementRect.y,
        width: dimensions.width,
        height: dimensions.height,
      },
    })

    spine.layout()
  }

  const load = (
    options: Required<Pick<ContextState, "manifest" | "containerElement">>,
  ) => {
    const { containerElement, manifest } = options

    if (context.manifest) {
      Report.warn(`loading a new book is not supported yet`)

      return
    }

    Report.log(`load`, { options })

    // @todo hook
    const element = createWrapperElement(containerElement)

    if (containerElement !== elementSubject$.getValue()?.parentElement) {
      elementSubject$.next(element)

      containerElement.appendChild(element)
    }

    context.update({
      manifest,
      containerElement,
      forceSinglePageMode: settingsManager.values.forceSinglePageMode,
    })

    layout()
  }

  merge(context.state$, settingsManager.values$)
    .pipe(
      map(() => undefined),
      withLatestFrom(context.state$),
      map(([, { hasVerticalWriting }]) => {
        const manifest = context.manifest

        return {
          hasVerticalWriting,
          renditionFlow: manifest?.renditionFlow,
          renditionLayout: manifest?.renditionLayout,
          computedPageTurnMode: settingsManager.values.computedPageTurnMode,
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
    viewport.destroy()
  }

  return {
    context,
    spine,
    hookManager,
    cfi: {
      generateCfiFromRange,
      generateCfiFromSelection,
      parseCfi,
      generateCfiForSpineItemPage: (params: {
        pageIndex: number
        spineItem: SpineItem
      }) =>
        generateCfiForSpineItemPage({
          ...params,
          spineItemLocator,
        }),
      resolveCfi: (
        params: Omit<Parameters<typeof resolveCfi>[0], "spineItemsManager">,
      ) => resolveCfi({ ...params, spineItemsManager }),
    },
    navigation: navigator,
    spineItemsObserver: spine.spineItemsObserver,
    spineItemsManager,
    layout,
    load,
    destroy,
    pagination: {
      getState: () => pagination.state,
      state$: pagination.state$,
    },
    settings: settingsManager as SettingsInterface<
      NonNullable<(typeof settingsManager)["inputSettings"]>,
      NonNullable<(typeof settingsManager)["outputSettings"]>
    >,
    viewport,
    element$,
    viewportState$: context.bridgeEvent.viewportState$,
    viewportFree$: context.bridgeEvent.viewportFree$,
    /**
     * Dispatched when the reader has loaded a book and is rendering a book.
     * Using navigation API and getting information about current content will
     * have an effect.
     * It can typically be used to hide a loading indicator.
     */
    state$: context.manifest$.pipe(
      map((manifest) => (manifest ? "ready" : "idle")),
    ),
    $: {
      state$: stateSubject$.asObservable(),
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
