import { BehaviorSubject, Subject } from "rxjs"
import { Report } from "./report"
import { LoadOptions } from "./types"
import { Manifest } from "@oboku/shared"

export type ContextObservableEvents = {}

type Settings = {
  forceSinglePageMode: boolean,
  pageTurnAnimation: `none` | `fade` | `slide`,
  pageTurnAnimationDuration: undefined | number
  pageTurnDirection: `vertical` | `horizontal`,
  pageTurnMode: `controlled` | `free`,
}

/**
 * Represent the settings that are derived from user settings.
 * Because some of the user settings can sometime be invalid based on some
 * context we need to use the computed one internally.
 * For example if the user decide to use horizontal page turn direction with scrolled content
 * we will overwrite it and force it to vertical (granted we only support vertical).
 */
type InnerSettings = Settings & {
  computedPageTurnMode: Settings[`pageTurnMode`],
  computedPageTurnDirection: Settings[`pageTurnDirection`],
  computedPageTurnAnimationDuration: number,
}

export const createContext = (initialSettings: Partial<Settings>) => {
  let manifest: Manifest | undefined
  let loadOptions: LoadOptions | undefined
  let settings: InnerSettings = {
    forceSinglePageMode: false,
    pageTurnAnimation: `none`,
    pageTurnDirection: `horizontal`,
    pageTurnAnimationDuration: undefined,
    pageTurnMode: `controlled`,
    computedPageTurnMode: `controlled`,
    computedPageTurnDirection: `horizontal`,
    computedPageTurnAnimationDuration: 0,
    ...initialSettings
  }

  updateComputedSettings(manifest, settings)

  const settings$ = new BehaviorSubject(settings)
  const subject = new Subject<ContextObservableEvents>()
  const loadSubject$ = new Subject<void>()
  const visibleAreaRect = {
    width: 0,
    height: 0,
    x: 0,
    y: 0
  }
  const horizontalMargin = 24
  const verticalMargin = 20
  const marginTop = 0
  const marginBottom = 0
  const destroy$ = new Subject<void>()

  /**
   * Global spread behavior
   * @see http://idpf.org/epub/fxl/#property-spread
   * @todo user setting
   */
  const shouldDisplaySpread = () => {
    const { height, width } = visibleAreaRect
    const isLandscape = width > height

    if (settings.forceSinglePageMode) return false

    /**
     * For now we don't support spread for reflowable & scrollable content since
     * two items could have different height, resulting in weird stuff.
     */
    if (manifest?.renditionFlow === `scrolled-continuous`) return false

    // portrait only
    if (!isLandscape && manifest?.renditionSpread === `portrait`) {
      return true
    }

    // default auto behavior
    return (
      isLandscape &&
      (
        manifest?.renditionSpread === undefined ||
        manifest?.renditionSpread === `auto` ||
        manifest?.renditionSpread === `landscape` ||
        manifest?.renditionSpread === `both`
      )
    )
  }

  const load = (newManifest: Manifest, newLoadOptions: LoadOptions) => {
    manifest = newManifest
    loadOptions = newLoadOptions

    updateComputedSettings(newManifest, settings)

    settings$.next(settings)

    loadSubject$.next()
  }

  /**
   * RTL only makes sense for horizontal scrolling
   */
  const isRTL = () => {
    return manifest?.readingDirection === `rtl`
  }

  const setSettings = (newSettings: Partial<typeof settings>) => {
    settings = { ...settings, ...newSettings }

    updateComputedSettings(manifest, settings)

    settings$.next(settings)
  }

  const getSettings = () => settings

  settings$.next(settings)

  const destroy = () => {
    subject.complete()
    settings$.complete()
    loadSubject$.complete()
    destroy$.next()
    destroy$.complete()
  }

  return {
    load,
    isRTL,
    destroy,
    getLoadOptions: () => loadOptions,
    setSettings,
    getSettings,
    getCalculatedInnerMargin: () => 0,
    getVisibleAreaRect: () => visibleAreaRect,
    shouldDisplaySpread,
    setVisibleAreaRect: (
      x: number,
      y: number,
      width: number,
      height: number
    ) => {
      // visibleAreaRect.width = width - horizontalMargin * 2
      visibleAreaRect.width = width
      visibleAreaRect.height = height - marginTop - marginBottom
      visibleAreaRect.x = x
      visibleAreaRect.y = y

      // if (this.useChromiumRubyBugSafeInnerMargin) {
      //   this.visibleAreaRect.height =
      //     this.visibleAreaRect.height - this.getCalculatedInnerMargin()
      // }
    },
    getHorizontalMargin: () => horizontalMargin,
    getVerticalMargin: () => verticalMargin,
    getPageSize: () => {
      return {
        width: shouldDisplaySpread()
          ? visibleAreaRect.width / 2
          : visibleAreaRect.width,
        height: visibleAreaRect.height
      }
    },
    $: {
      $: subject.asObservable(),
      destroy$: destroy$.asObservable(),
      /**
       * Will emit once on start
       */
      settings$: settings$.asObservable(),
      load$: loadSubject$.asObservable()
    },
    getManifest: () => manifest,
    getReadingDirection: () => manifest?.readingDirection
  }
}

export type Context = ReturnType<typeof createContext>

const updateComputedSettings = (newManifest: Manifest | undefined, settings: InnerSettings) => {
  settings.computedPageTurnDirection = settings.pageTurnDirection

  if (newManifest?.renditionFlow === `scrolled-continuous`) {
    settings.computedPageTurnMode = `free`
    settings.computedPageTurnDirection = `vertical`
  } else if (newManifest && settings.pageTurnMode === `free` && newManifest.renditionLayout !== `pre-paginated`) {
    Report.warn(`pageTurnMode incompatible with current book, switching back to controlled mode`)
    settings.computedPageTurnMode = `controlled`
  } else {
    settings.computedPageTurnMode = settings.pageTurnMode
  }

  settings.computedPageTurnAnimationDuration = settings.pageTurnAnimationDuration !== undefined
    ? settings.pageTurnAnimationDuration
    : 300
}
