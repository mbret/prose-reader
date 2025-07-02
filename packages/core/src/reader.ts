import { type Observable, type ObservedValueOf, of, Subject } from "rxjs"
import { map } from "rxjs/operators"
import {
  generateCfiForSpineItemPage,
  generateCfiFromRange,
  parseCfi,
} from "./cfi"
import { resolveCfi } from "./cfi/resolve"
import { HTML_PREFIX } from "./constants"
import { Context, type ContextState } from "./context/Context"
import { Features } from "./features/Features"
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
import { createSpineItemLocator } from "./spineItem/locationResolver"
import type { SpineItem, SpineItemReference } from "./spineItem/SpineItem"
import { Viewport } from "./viewport/Viewport"

export type CreateReaderOptions = Partial<CoreInputSettings>

export type CreateReaderParameters = CreateReaderOptions

export type ContextSettings = Partial<CoreInputSettings>

export type ReaderInternal = ReturnType<typeof createReader>

export const createReader = (inputSettings: CreateReaderOptions) => {
  const destroy$ = new Subject<void>()
  const hookManager = new HookManager()
  const context = new Context()
  const settingsManager = new ReaderSettingsManager(inputSettings, context)
  const features = new Features(context, settingsManager)
  const spineItemsManager = new SpineItemsManager(context, settingsManager)
  const viewport = new Viewport(context)
  const element$ = context.watch(`rootElement`)
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
  navigator.locker.isLocked$.subscribe(
    context.bridgeEvent.navigationIsLockedSubject,
  )
  pagination.subscribe(context.bridgeEvent.paginationSubject)

  const layout = () => {
    const containerElement = context.value.rootElement

    if (!containerElement) return

    const dimensions = {
      width: containerElement?.offsetWidth,
      height: containerElement?.offsetHeight,
    }
    const margin = 0
    const marginTop = 0
    const marginBottom = 0

    containerElement.style.setProperty(`overflow`, `hidden`)

    if (margin > 0 || marginTop > 0 || marginBottom > 0) {
      containerElement.style.margin = `${marginTop}px ${margin}px ${marginBottom}px`
    }
    const elementRect = containerElement.getBoundingClientRect()

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
    options: Required<
      Pick<ContextState, "manifest"> & { containerElement: HTMLElement }
    >,
  ) => {
    const { containerElement, manifest } = options

    if (context.manifest) {
      Report.warn(`loading a new book is not supported yet`)

      return
    }

    Report.log(`load`, { options })

    const element = wrapContainer(containerElement)

    context.update({
      manifest,
      rootElement: element,
      forceSinglePageMode: settingsManager.values.forceSinglePageMode,
    })

    layout()
  }

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
    features.destroy()
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
      parseCfi,
      generateCfiForSpineItemPage: (params: {
        pageIndex: number
        spineItem: SpineItem
      }) =>
        generateCfiForSpineItemPage({
          ...params,
          spine,
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
      get state() {
        return pagination.value
      },
      get state$(): Observable<ObservedValueOf<typeof pagination>> {
        return pagination
      },
    },
    settings: settingsManager as SettingsInterface<
      NonNullable<(typeof settingsManager)["inputSettings"]>,
      NonNullable<(typeof settingsManager)["outputSettings"]>
    >,
    renderHeadless: (spineItem: SpineItemReference) => {
      return (
        spineItemsManager.get(spineItem)?.renderer.renderHeadless() ??
        of(undefined)
      )
    },
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
    features,
    $: {
      destroy$,
    },
  }
}

const wrapContainer = (containerElement: HTMLElement) => {
  containerElement.style.cssText = `
    ${containerElement.style.cssText}
    background-color: white;
    position: relative;
  `
  containerElement.classList.add(`${HTML_PREFIX}-reader`)

  return containerElement
}

type Reader = ReturnType<typeof createReader>

export type { Reader }
