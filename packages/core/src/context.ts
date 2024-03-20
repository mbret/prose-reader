/* eslint-disable @typescript-eslint/ban-types */
import { BehaviorSubject, Observable, Subject, merge } from "rxjs"
import { distinctUntilChanged, takeUntil, tap, map, filter, withLatestFrom } from "rxjs/operators"
import { Manifest } from "@prose-reader/shared"
import { createSettings, PublicSettings } from "./settings"
import { LoadOptions } from "./types/reader"
import { isDefined } from "./utils/isDefined"

type SettingsManager = ReturnType<typeof createSettings>

type State = Partial<Pick<LoadOptions, "containerElement" | "fetchResource">> & {
  manifest?: Manifest
  hasVerticalWriting?: boolean
}

export type Context = {
  load: (newManifest: Manifest, newLoadOptions: LoadOptions) => void
  setSettings: (data: Partial<PublicSettings>) => void
  getSettings: () => ReturnType<SettingsManager[`getSettings`]>
  getManifest: () => Manifest | undefined
  areAllItemsPrePaginated: () => boolean
  getCalculatedInnerMargin: () => number
  getVisibleAreaRect: () => { width: number; height: number; x: number; y: number }
  shouldDisplaySpread: () => boolean
  setHasVerticalWriting: () => void
  getReadingDirection: () => Manifest[`readingDirection`] | undefined
  getPageSize: () => { height: number; width: number }
  setVisibleAreaRect: (options: { x: number; y: number; width: number; height: number }) => void
  isRTL: () => boolean
  destroy: () => void
  getState: () => State
  containerElement$: Observable<HTMLElement>
  $: {
    settings$: Observable<ReturnType<SettingsManager[`getSettings`]>>
    destroy$: Observable<void>
    state$: Observable<State>
    manifest$: Observable<Manifest>
  }
}

export type ContextObservableEvents = {}

export const createContext = (initialSettings: Parameters<typeof createSettings>[0]): Context => {
  const stateSubject = new BehaviorSubject<State>({})
  const manifest$ = stateSubject.pipe(
    map((state) => state.manifest),
    filter(isDefined),
    distinctUntilChanged(),
  )
  const containerElement$ = stateSubject.pipe(
    map((state) => state.containerElement),
    filter(isDefined),
    distinctUntilChanged(),
  )
  const hasVerticalWritingSubject$ = stateSubject.pipe(
    map((state) => state.hasVerticalWriting),
    filter(isDefined),
    distinctUntilChanged(),
  )
  const visibleAreaRect = {
    width: 0,
    height: 0,
    x: 0,
    y: 0,
  }
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
    const manifest = stateSubject.getValue().manifest
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
    stateSubject.next({
      manifest: newManifest,
      ...newLoadOptions,
    })
  }

  /**
   * RTL only makes sense for horizontal scrolling
   */
  const isRTL = () => {
    return stateSubject.getValue().manifest?.readingDirection === `rtl`
  }

  const setHasVerticalWriting = () =>
    stateSubject.next({
      ...stateSubject.getValue(),
      hasVerticalWriting: true,
    })

  const recomputeSettings$ = merge(hasVerticalWritingSubject$, manifest$)

  recomputeSettings$
    .pipe(
      withLatestFrom(hasVerticalWritingSubject$, manifest$),
      tap(([, hasVerticalWritingSubject, manifest]) => {
        settings.recompute({ hasVerticalWritingSubject, manifest })
      }),
      takeUntil(destroy$),
    )
    .subscribe()

  const destroy = () => {
    settings.destroy()
    stateSubject.complete()
    destroy$.next()
    destroy$.complete()
  }

  return {
    load,
    isRTL,
    areAllItemsPrePaginated: () => areAllItemsPrePaginated(stateSubject.getValue()?.manifest),
    destroy,
    getCalculatedInnerMargin: () => 0,
    getVisibleAreaRect: () => visibleAreaRect,
    shouldDisplaySpread,
    setHasVerticalWriting,
    setVisibleAreaRect: ({ height, width, x, y }: { x: number; y: number; width: number; height: number }) => {
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
    getState: () => stateSubject.getValue(),
    getManifest: () => stateSubject.getValue()?.manifest,
    getReadingDirection: () => stateSubject.getValue()?.manifest?.readingDirection,
    getPageSize: () => {
      return {
        width: shouldDisplaySpread() ? visibleAreaRect.width / 2 : visibleAreaRect.width,
        height: visibleAreaRect.height,
      }
    },
    getSettings: settings.getSettings,
    setSettings: (data: Parameters<typeof settings.setSettings>[0]) => settings.setSettings(data, stateSubject.getValue()),
    containerElement$,
    $: {
      manifest$,
      destroy$: destroy$.asObservable(),
      settings$: settings.$.settings$,
      state$: stateSubject.asObservable(),
    },
  }
}

const areAllItemsPrePaginated = (manifest: Manifest | undefined) =>
  !manifest?.spineItems.some((item) => item.renditionLayout === `reflowable`)
