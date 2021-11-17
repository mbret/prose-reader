import { BehaviorSubject, Subject } from "rxjs"
import { distinctUntilChanged, takeUntil, tap, skip } from "rxjs/operators"
import { Report } from "./report"
import { LoadOptions } from "./types"
import { Manifest } from "@oboku/shared"
import { isShallowEqual } from "./utils/objects"

export type ContextObservableEvents = {}

type PublicSettings = {
  forceSinglePageMode: boolean,
  pageTurnAnimation: `none` | `fade` | `slide`,
  pageTurnAnimationDuration: undefined | number
  pageTurnDirection: `vertical` | `horizontal`,
  pageTurnMode: `controlled` | `scrollable`
}

/**
 * Represent the settings that are derived from user settings.
 * Because some of the user settings can sometime be invalid based on some
 * context we need to use the computed one internally.
 * For example if the user decide to use horizontal page turn direction with scrolled content
 * we will overwrite it and force it to vertical (granted we only support vertical).
 */
type InnerSettings = PublicSettings & {
  computedPageTurnMode: PublicSettings[`pageTurnMode`],
  computedPageTurnDirection: PublicSettings[`pageTurnDirection`],
  computedPageTurnAnimation: PublicSettings[`pageTurnAnimation`],
  computedPageTurnAnimationDuration: number,
  computedSnapAnimationDuration: number,
}

export const createContext = (initialSettings: Partial<PublicSettings>) => {
  let manifest: Manifest | undefined
  let loadOptions: LoadOptions | undefined
  const hasVerticalWritingSubject$ = new BehaviorSubject(false)
  const loadSubject$ = new Subject<Manifest>()
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
  const mergedSettings: InnerSettings = {
    forceSinglePageMode: false,
    pageTurnAnimation: `none`,
    computedPageTurnAnimation: `none`,
    pageTurnDirection: `horizontal`,
    computedPageTurnDirection: `horizontal`,
    pageTurnAnimationDuration: undefined,
    computedPageTurnAnimationDuration: 0,
    pageTurnMode: `controlled`,
    computedPageTurnMode: `controlled`,
    computedSnapAnimationDuration: 300,
    ...initialSettings
  }
  updateComputedSettings(undefined, mergedSettings, hasVerticalWritingSubject$.value)
  const settingsSubject$ = new BehaviorSubject(mergedSettings)

  /**
   * Global spread behavior
   * @see http://idpf.org/epub/fxl/#property-spread
   * @todo user setting
   */
  const shouldDisplaySpread = () => {
    const { height, width } = visibleAreaRect
    const isLandscape = width > height

    if (settingsSubject$.value.forceSinglePageMode) return false

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

    setSettings({})

    loadSubject$.next(newManifest)
  }

  /**
   * RTL only makes sense for horizontal scrolling
   */
  const isRTL = () => {
    return manifest?.readingDirection === `rtl`
  }

  const setSettings = (newSettings: Partial<PublicSettings>) => {
    const mergedSettings = { ...settingsSubject$.value, ...newSettings }

    updateComputedSettings(manifest, mergedSettings, hasVerticalWritingSubject$.value)

    settingsSubject$.next(mergedSettings)
  }

  const getSettings = () => settingsSubject$.value

  const setHasVerticalWriting = () => hasVerticalWritingSubject$.next(true)

  /**
   * Some behavior may trigger settings to change
   */
  hasVerticalWritingSubject$
    .pipe(
      skip(1),
      distinctUntilChanged(),
      tap(() => {
        setSettings({})
      }),
      takeUntil(destroy$)
    )
    .subscribe()

  const destroy = () => {
    settingsSubject$.complete()
    loadSubject$.complete()
    destroy$.next()
    destroy$.complete()
    hasVerticalWritingSubject$.complete()
  }

  return {
    load,
    isRTL,
    areAllItemsPrePaginated: () => areAllItemsPrePaginated(manifest),
    destroy,
    getLoadOptions: () => loadOptions,
    setSettings,
    getSettings,
    getCalculatedInnerMargin: () => 0,
    getVisibleAreaRect: () => visibleAreaRect,
    shouldDisplaySpread,
    setHasVerticalWriting,
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
    getManifest: () => manifest,
    getReadingDirection: () => manifest?.readingDirection,
    getPageSize: () => {
      return {
        width: shouldDisplaySpread()
          ? visibleAreaRect.width / 2
          : visibleAreaRect.width,
        height: visibleAreaRect.height
      }
    },
    $: {
      hasVerticalWriting$: hasVerticalWritingSubject$
        .asObservable()
        .pipe(distinctUntilChanged()),
      destroy$: destroy$
        .asObservable(),
      settings$: settingsSubject$
        .asObservable()
        .pipe(distinctUntilChanged(isShallowEqual)),
      load$: loadSubject$
        .asObservable()
    }
  }
}

export type Context = ReturnType<typeof createContext>

const areAllItemsPrePaginated = (manifest: Manifest | undefined) => !manifest?.spineItems.some(item => item.renditionLayout === `reflowable`)

const updateComputedSettings = (newManifest: Manifest | undefined, settings: InnerSettings, hasVerticalWriting: boolean) => {
  settings.computedPageTurnDirection = settings.pageTurnDirection
  settings.computedPageTurnAnimation = settings.pageTurnAnimation
  settings.computedPageTurnMode = `controlled`

  // We force scroll mode for some books
  if (newManifest?.renditionFlow === `scrolled-continuous`) {
    settings.computedPageTurnMode = `scrollable`
    settings.computedPageTurnDirection = `vertical`
  } else if (newManifest && settings.pageTurnMode === `scrollable` && (newManifest.renditionLayout !== `pre-paginated` || !areAllItemsPrePaginated(newManifest))) {
    Report.warn(`pageTurnMode ${settings.pageTurnMode} incompatible with current book, switching back to default`)
    settings.computedPageTurnAnimation = `none`
    settings.computedPageTurnMode = `controlled`
  } else if (settings.pageTurnMode === `scrollable`) {
    settings.computedPageTurnMode = `scrollable`
    settings.computedPageTurnDirection = `vertical`
  }

  // some settings are not available for vertical writing
  if (hasVerticalWriting && settings.computedPageTurnAnimation === `slide`) {
    Report.warn(`pageTurnAnimation ${settings.computedPageTurnAnimation} incompatible with current book, switching back to default`)
    settings.computedPageTurnAnimation = `none`
  }

  if (settings.computedPageTurnMode === `scrollable`) {
    settings.computedPageTurnAnimationDuration = 0
  } else {
    settings.computedPageTurnAnimationDuration = settings.pageTurnAnimationDuration !== undefined
      ? settings.pageTurnAnimationDuration
      : 300
  }
}
