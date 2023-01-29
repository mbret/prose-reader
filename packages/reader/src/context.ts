import { BehaviorSubject, Observable, Subject } from "rxjs"
import { distinctUntilChanged, takeUntil, tap, skip } from "rxjs/operators"
import { LoadOptions } from "./types"
import { Manifest } from "@prose-reader/shared"
import { createSettings, PublicSettings } from "./settings"

type SettingsManager = ReturnType<typeof createSettings>

export type Context = {
  load: (newManifest: Manifest, newLoadOptions: LoadOptions) => void
  setSettings: (data: Partial<PublicSettings>) => void
  getSettings: () => ReturnType<SettingsManager[`getSettings`]>
  getManifest: () => Manifest | undefined
  areAllItemsPrePaginated: () => boolean
  getLoadOptions: () => LoadOptions | undefined
  getCalculatedInnerMargin: () => number
  getVisibleAreaRect: () => { width: number; height: number; x: number; y: number }
  shouldDisplaySpread: () => boolean
  setHasVerticalWriting: () => void
  getReadingDirection: () => Manifest[`readingDirection`] | undefined
  getPageSize: () => { height: number; width: number }
  setVisibleAreaRect: (x: number, y: number, width: number, height: number) => void
  isRTL: () => boolean
  destroy: () => void
  $: {
    hasVerticalWriting$: Observable<boolean>
    settings$: Observable<ReturnType<SettingsManager[`getSettings`]>>
    destroy$: Observable<void>
    load$: Observable<Manifest>
  }
}

export type ContextObservableEvents = {}

export const createContext = (initialSettings: Parameters<typeof createSettings>[0]): Context => {
  let manifest: Manifest | undefined
  let loadOptions: LoadOptions | undefined
  const hasVerticalWritingSubject$ = new BehaviorSubject(false)
  const loadSubject$ = new Subject<Manifest>()
  const visibleAreaRect = {
    width: 0,
    height: 0,
    x: 0,
    y: 0,
  }
  const horizontalMargin = 24
  const verticalMargin = 20
  const marginTop = 0
  const marginBottom = 0
  const destroy$ = new Subject<void>()
  const settings = createSettings(initialSettings)

  /**
   * Global spread behavior
   * @see http://idpf.org/epub/fxl/#property-spread
   * @todo user setting
   */
  const shouldDisplaySpread = () => {
    const { height, width } = visibleAreaRect
    const isLandscape = width > height

    if (settings.getSettings().forceSinglePageMode) return false

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
      (manifest?.renditionSpread === undefined ||
        manifest?.renditionSpread === `auto` ||
        manifest?.renditionSpread === `landscape` ||
        manifest?.renditionSpread === `both`)
    )
  }

  const load = (newManifest: Manifest, newLoadOptions: LoadOptions) => {
    manifest = newManifest
    loadOptions = newLoadOptions

    settings.recompute({ manifest, hasVerticalWritingSubject: hasVerticalWritingSubject$.value })

    loadSubject$.next(newManifest)
  }

  /**
   * RTL only makes sense for horizontal scrolling
   */
  const isRTL = () => {
    return manifest?.readingDirection === `rtl`
  }

  const setHasVerticalWriting = () => hasVerticalWritingSubject$.next(true)

  /**
   * Some behavior may trigger settings to change
   */
  hasVerticalWritingSubject$
    .pipe(
      skip(1),
      distinctUntilChanged(),
      tap(() => {
        settings.recompute({ manifest, hasVerticalWritingSubject: hasVerticalWritingSubject$.value })
      }),
      takeUntil(destroy$)
    )
    .subscribe()

  const destroy = () => {
    settings.destroy()
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
    getCalculatedInnerMargin: () => 0,
    getVisibleAreaRect: () => visibleAreaRect,
    shouldDisplaySpread,
    setHasVerticalWriting,
    setVisibleAreaRect: (x: number, y: number, width: number, height: number) => {
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
    getManifest: () => manifest,
    getReadingDirection: () => manifest?.readingDirection,
    getPageSize: () => {
      return {
        width: shouldDisplaySpread() ? visibleAreaRect.width / 2 : visibleAreaRect.width,
        height: visibleAreaRect.height,
      }
    },
    getSettings: settings.getSettings,
    setSettings: (data: Parameters<typeof settings.setSettings>[0]) =>
      settings.setSettings(data, {
        hasVerticalWritingSubject: hasVerticalWritingSubject$.value,
        manifest,
      }),
    $: {
      hasVerticalWriting$: hasVerticalWritingSubject$.asObservable().pipe(distinctUntilChanged()),
      destroy$: destroy$.asObservable(),
      settings$: settings.$.settings$,
      load$: loadSubject$.asObservable(),
    },
  }
}

const areAllItemsPrePaginated = (manifest: Manifest | undefined) =>
  !manifest?.spineItems.some((item) => item.renditionLayout === `reflowable`)
