import type { Manifest } from "@prose-reader/shared"
import { merge, type Observable, type ObservedValueOf, of, Subject } from "rxjs"
import { distinctUntilChanged, map, skip, takeUntil, tap } from "rxjs/operators"
import { CfiManager } from "./cfi"
import {
  HTML_ATTRIBUTE_DATA_READER_ID,
  HTML_PREFIX,
  HTML_STYLE_PREFIX,
} from "./constants"
import { Context } from "./context/Context"
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
import type { SpineItemReference } from "./spineItem/SpineItem"
import { injectCSS, removeCSS, setAttributeIfChanged } from "./utils/dom"
import { isDefined } from "./utils/isDefined"
import { Viewport } from "./viewport/Viewport"

export type CreateReaderOptions = Partial<CoreInputSettings> & {
  /**
   * The manifest of the book to read. A reader is tied to a single book,
   * create a new reader if you need to open another book.
   */
  manifest: Manifest
  /**
   * Optional initial reading position. The reader will restore the position
   * once mounted. This is handled by the navigation enhancer.
   */
  cfi?: string
}

export type CreateReaderParameters = CreateReaderOptions

export type ContextSettings = Partial<CoreInputSettings>

export type ReaderInternal = ReturnType<typeof createReader>

type ReaderLayoutOptions = {
  immediate?: boolean
}

export const createReader = ({
  manifest,
  // handled by the navigation enhancer, extracted so it does not leak into settings
  cfi: _cfi,
  ...inputSettings
}: CreateReaderOptions) => {
  const id = crypto.randomUUID()
  // Keyed per-reader so mount/destroy are symmetric: each reader injects and
  // removes its own <style>. The stylesheet content is global (keyed on shared
  // classes/attributes) so coexisting readers get identical duplicates rather
  // than fighting over a single shared element.
  const stylesId = `${HTML_STYLE_PREFIX}-core-${id}`
  const layoutSubject = new Subject<ReaderLayoutOptions>()
  const destroy$ = new Subject<void>()
  const hookManager = new HookManager()
  const context = new Context(manifest)
  const settingsManager = new ReaderSettingsManager(inputSettings, context)
  const features = new Features(context, settingsManager)
  const spineItemsManager = new SpineItemsManager(context, settingsManager)
  const cfi = new CfiManager(hookManager, spineItemsManager)
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
    cfi,
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
    navigator.isLocked$,
    cfi,
  )

  // bridge all navigation stream with reader so they can be shared across app
  navigator.navigationState$.subscribe(context.bridgeEvent.viewportStateSubject)
  navigator.navigation$.subscribe(context.bridgeEvent.navigationSubject)
  navigator.position$.subscribe(context.bridgeEvent.positionSubject)
  pagination.subscribe(context.bridgeEvent.paginationSubject)

  const layout = (options: ReaderLayoutOptions = {}) => {
    layoutSubject.next(options)
  }

  /**
   * Attach the reader to the DOM and start rendering the book.
   *
   * This is a one-shot operation, a reader renders a single book into a
   * single container. Calling it a second time throws. If you need to open
   * another book or move to another container, destroy the reader and
   * create a new one.
   */
  const mount = (containerElement: HTMLElement) => {
    if (context.value.rootElement) {
      throw new Error(
        `This reader is already mounted. A reader renders a single book, destroy it and create a new reader instead.`,
      )
    }

    Report.log(`mount`, { containerElement })

    injectCSS(document, stylesId, styles)

    const element = wrapContainer(containerElement, id)

    context.update({
      rootElement: element,
    })

    layout({ immediate: true })
  }

  const layoutOnSpreadModeChange$ = settingsManager
    .watch([`computedSpreadMode`])
    .pipe(
      skip(1),
      tap(() => layout()),
    )

  const layout$ = layoutSubject.pipe(
    tap((options) => {
      const containerElement = context.value.rootElement

      // rootElement is only set at mount; skip layout until then.
      if (!containerElement) return

      viewport.layout()
      spine.layout(options)
    }),
    takeUntil(destroy$),
  )

  const subs = merge(layout$, layoutOnSpreadModeChange$).subscribe()

  /**
   * Free up resources, and dispose the whole reader.
   * You should call this method if you leave the reader.
   *
   * It is not possible to use any of the reader features once it
   * has been destroyed. If you need to open a new book, create a new
   * reader.
   */
  const destroy = () => {
    const containerElement = context.value.rootElement

    removeCSS(document, stylesId)

    if (containerElement) {
      unwrapContainer(containerElement)
    }

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
    cfi,
    navigation: navigator,
    spineItemsObserver: spine.spineItemsObserver,
    spineItemsManager,
    layout,
    mount,
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
     * Emits false until the reader is mounted, then true.
     *
     * Once mounted the reader is rendering the book. Using navigation API
     * and getting information about current content will have an effect.
     * It can typically be used to hide a loading indicator.
     */
    mounted$: context
      .watch(`rootElement`)
      .pipe(map(isDefined), distinctUntilChanged()),
    features,
    $: {
      destroy$,
    },
  }
}

const CONTAINER_CLASS = `${HTML_PREFIX}-reader`
const CONTAINER_ATTRIBUTE = `data-prose-reader-container`

// The container's base styles (background, position, overflow) live in the
// injected stylesheet keyed on CONTAINER_CLASS rather than as inline styles.
// This keeps mount side-effect free on the element beyond adding the class and
// two attributes, so unwrapContainer can fully revert them on destroy and a
// reused container accumulates nothing across mounts.
const wrapContainer = (containerElement: HTMLElement, id: string) => {
  containerElement.classList.add(CONTAINER_CLASS)
  setAttributeIfChanged(containerElement, HTML_ATTRIBUTE_DATA_READER_ID, id)
  setAttributeIfChanged(containerElement, CONTAINER_ATTRIBUTE, id)

  return containerElement
}

const unwrapContainer = (containerElement: HTMLElement) => {
  containerElement.classList.remove(CONTAINER_CLASS)
  containerElement.removeAttribute(HTML_ATTRIBUTE_DATA_READER_ID)
  containerElement.removeAttribute(CONTAINER_ATTRIBUTE)
}

type Reader = ReturnType<typeof createReader>

export type { Reader }
