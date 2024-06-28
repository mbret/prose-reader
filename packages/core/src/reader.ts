import { BehaviorSubject, merge, ObservedValueOf, Subject, switchMap } from "rxjs"
import { Report } from "./report"
import { Context } from "./context/Context"
import { createPagination } from "./pagination/pagination"
import { createSpine } from "./spine/createSpine"
import { HTML_PREFIX } from "./constants"
import { takeUntil, tap, distinctUntilChanged, withLatestFrom, map, filter } from "rxjs/operators"
import { createSelection } from "./selection"
import { createSpineItemManager } from "./spineItemManager"
import { isShallowEqual } from "./utils/objects"
import { createViewportNavigator } from "./viewportNavigator/viewportNavigator"
import { createLocationResolver as createSpineItemLocator } from "./spineItem/locationResolver"
import { createLocationResolver as createSpineLocator } from "./spine/locationResolver"
import { createCfiLocator } from "./spine/cfiLocator"
import { AdjustedNavigation, Navigation } from "./viewportNavigator/types"
import { Manifest } from "@prose-reader/shared"
import { LoadOptions, ReaderInternal } from "./types/reader"
import { isDefined } from "./utils/isDefined"
import { ReaderSettingsManager } from "./settings/ReaderSettingsManager"
import { HookManager } from "./hooks/HookManager"
import { CoreInputSettings } from "./settings/types"

export type CreateReaderOptions = Partial<CoreInputSettings>

export type CreateReaderParameters = CreateReaderOptions

export const createReader = (inputSettings: CreateReaderOptions): ReaderInternal => {
  const stateSubject$ = new BehaviorSubject<ObservedValueOf<ReaderInternal["$"]["state$"]>>({
    supportedPageTurnAnimation: [`fade`, `none`, `slide`],
    supportedPageTurnMode: [`controlled`, `scrollable`],
    supportedPageTurnDirection: [`horizontal`, `vertical`],
    supportedComputedPageTurnDirection: [`horizontal`, `vertical`],
  })
  const destroy$ = new Subject<void>()
  const selectionSubject$ = new Subject<ReturnType<typeof createSelection> | null>()
  const navigationSubject = new Subject<Navigation>()
  const navigationAdjustedSubject = new Subject<AdjustedNavigation>()
  const currentNavigationPositionSubject$ = new BehaviorSubject({ x: 0, y: 0 })
  const viewportStateSubject = new BehaviorSubject<`free` | `busy`>(`free`)
  const hookManager = new HookManager()
  const context = new Context()
  const settingsManager = new ReaderSettingsManager(inputSettings, context)
  const spineItemManager = createSpineItemManager({ context, settings: settingsManager })
  const pagination = createPagination({ context, spineItemManager })

  const elementSubject$ = new BehaviorSubject<HTMLElement | undefined>(undefined)
  const element$ = elementSubject$.pipe(filter(isDefined))
  const spineItemLocator = createSpineItemLocator({ context })
  const spineLocator = createSpineLocator({
    context,
    spineItemManager,
    spineItemLocator,
    settings: settingsManager,
  })
  const cfiLocator = createCfiLocator({
    spineItemManager,
    context,
    spineItemLocator,
  })

  const navigation$ = navigationSubject.asObservable()

  const spine = createSpine({
    element$,
    context,
    settings: settingsManager,
    pagination,
    spineItemManager,
    navigation$,
    spineLocator,
    spineItemLocator,
    cfiLocator,
    navigationAdjusted$: navigationAdjustedSubject.asObservable(),
    viewportState$: viewportStateSubject.asObservable(),
    currentNavigationPosition$: currentNavigationPositionSubject$.asObservable(),
    hookManager,
  })

  const viewportNavigator = createViewportNavigator({
    context,
    pagination,
    spineItemManager,
    parentElement$: elementSubject$,
    cfiLocator,
    spineLocator,
    hookManager,
    spine,
    settings: settingsManager,
  })

  // bridge all navigation stream with reader so they can be shared across app
  viewportNavigator.$.state$.subscribe(viewportStateSubject)
  viewportNavigator.$.navigation$.subscribe(navigationSubject)
  viewportNavigator.$.navigationAdjustedAfterLayout$.subscribe(navigationAdjustedSubject)
  viewportNavigator.$.currentNavigationPosition$.subscribe(currentNavigationPositionSubject$)

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
      containerElementWidth % 2 === 0 || isReflow ? containerElementWidth : containerElementWidth - 1 // @todo careful with the -1, dunno why it's here yet

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

    viewportNavigator.layout()
  }

  const load = (manifest: Manifest, loadOptions: LoadOptions) => {
    if (context.manifest) {
      Report.warn(`loading a new book is not supported yet`)

      return
    }

    Report.log(`load`, { manifest, loadOptions })

    // @todo hook
    const element = createWrapperElement(loadOptions.containerElement)

    if (loadOptions.containerElement !== elementSubject$.getValue()?.parentElement) {
      elementSubject$.next(element)

      loadOptions.containerElement.appendChild(element)
    }

    context.update({ manifest, ...loadOptions, forceSinglePageMode: settingsManager.settings.forceSinglePageMode })

    // manifest.readingOrder.forEach((_, index) => resourcesManager.cache(index))

    layout()

    if (!loadOptions.cfi) {
      viewportNavigator.goToSpineItem(0, { animate: false })
    } else {
      viewportNavigator.goToCfi(loadOptions.cfi, { animate: false })
    }
  }

  spine.$.$.pipe(
    tap((event) => {
      if (event.type === `onSelectionChange`) {
        selectionSubject$.next(event.data)
      }
    }),
    takeUntil(destroy$),
  ).subscribe()

  viewportNavigator.$.navigationAdjustedAfterLayout$
    .pipe(
      switchMap(({ adjustedSpinePosition }) => {
        return spine.adjustPagination(adjustedSpinePosition).pipe(takeUntil(navigation$))
      }),
      takeUntil(context.destroy$),
    )
    .subscribe()

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
    settingsManager.destroy()
    pagination.destroy()
    context.destroy()
    viewportNavigator.destroy()
    spine.destroy()
    elementSubject$.getValue()?.remove()
    stateSubject$.complete()
    selectionSubject$.complete()
    destroy$.next()
    destroy$.complete()
  }

  const reader = {
    context,
    spine,
    hookManager,
    viewportNavigator,
    spineItemManager,
    layout,
    load,
    destroy,
    pagination,
    settings: settingsManager,
    element$,
    $: {
      state$: stateSubject$.asObservable(),
      /**
       * Dispatched when the reader has loaded a book and is rendering a book.
       * Using navigation API and getting information about current content will
       * have an effect.
       * It can typically be used to hide a loading indicator.
       */
      loadStatus$: context.manifest$.pipe(map((manifest) => (manifest ? "ready" : "idle"))),
      /**
       * Dispatched when a change in selection happens
       */
      selection$: selectionSubject$.asObservable(),
      destroy$,
    },
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

type Reader = ReturnType<typeof createReader>

export type { Reader }
