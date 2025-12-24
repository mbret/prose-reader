import { merge, type Observable, type ObservedValueOf, of, Subject } from "rxjs"
import { map, skip, takeUntil, tap } from "rxjs/operators"
import {
  generateCfiForSpineItemPage,
  generateCfiFromRange,
  parseCfi,
} from "./cfi"
import { resolveCfi } from "./cfi/resolve"
import {
  HTML_ATTRIBUTE_DATA_READER_ID,
  HTML_PREFIX,
  HTML_STYLE_PREFIX,
} from "./constants"
import { Context, type ContextState } from "./context/Context"
import { Features } from "./features/Features"
import { HookManager } from "./hooks/HookManager"
import styles from "./index.scss?inline"
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
import { injectCSS, removeCSS } from "./utils/dom"
import { Viewport } from "./viewport/Viewport"

export type CreateReaderOptions = Partial<CoreInputSettings>

export type CreateReaderParameters = CreateReaderOptions

export type ContextSettings = Partial<CoreInputSettings>

export type ReaderInternal = ReturnType<typeof createReader>

const STYLES_ID = `${HTML_STYLE_PREFIX}-core`

export const createReader = (inputSettings: CreateReaderOptions) => {
  const id = crypto.randomUUID()
  const layoutSubject = new Subject<void>()
  const destroy$ = new Subject<void>()
  const hookManager = new HookManager()
  const context = new Context()
  const settingsManager = new ReaderSettingsManager(inputSettings, context)
  const features = new Features(context, settingsManager)
  const spineItemsManager = new SpineItemsManager(context, settingsManager)
  const viewport = new Viewport(context, settingsManager)
  const spineItemLocator = createSpineItemLocator({
    context,
    settings: settingsManager,
    viewport,
  })
  const pagination = new Pagination(context, spineItemsManager)
  const spine = new Spine(
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
  navigator.navigationState$.subscribe(context.bridgeEvent.viewportStateSubject)
  navigator.navigation$.subscribe(context.bridgeEvent.navigationSubject)
  navigator.locker.isLocked$.subscribe(
    context.bridgeEvent.navigationIsLockedSubject,
  )
  pagination.subscribe(context.bridgeEvent.paginationSubject)

  const layout = () => {
    layoutSubject.next()
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

    const element = wrapContainer(containerElement, id)

    context.update({
      manifest,
      rootElement: element,
    })

    layout()
  }

  const layoutOnSpreadModeChange$ = settingsManager
    .watch([`computedSpreadMode`])
    .pipe(skip(1), tap(layout))

  const layout$ = layoutSubject.pipe(
    tap(() => {
      const containerElement = context.value.rootElement

      if (!containerElement) return

      containerElement.style.setProperty(`overflow`, `hidden`)

      viewport.layout()
      spine.layout()
    }),
    takeUntil(destroy$),
  )

  const subs = merge(layout$, layoutOnSpreadModeChange$).subscribe()

  injectCSS(document, STYLES_ID, styles)

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
    removeCSS(document, STYLES_ID)

    subs.unsubscribe()
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
    id,
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

const wrapContainer = (containerElement: HTMLElement, id: string) => {
  containerElement.style.cssText = `
    ${containerElement.style.cssText}
    background-color: white;
    position: relative;
  `
  containerElement.classList.add(`${HTML_PREFIX}-reader`)
  containerElement.setAttribute(HTML_ATTRIBUTE_DATA_READER_ID, id)
  containerElement.setAttribute("data-prose-reader-container", id)

  return containerElement
}

type Reader = ReturnType<typeof createReader>

export type { Reader }
