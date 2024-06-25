/* eslint-disable @typescript-eslint/ban-types */
import { BehaviorSubject, ObservedValueOf, Subject, merge } from "rxjs"
import { distinctUntilChanged, takeUntil, tap, map, filter, withLatestFrom } from "rxjs/operators"
import { Manifest } from "@prose-reader/shared"
import { createSettings } from "../settings/settings"
import { isDefined } from "../utils/isDefined"
import { isUsingSpreadMode } from "./isUsingSpreadMode"
import { isShallowEqual } from "../utils/objects"
import { isFullyPrePaginated } from "../manifest/isFullyPrePaginated"
import { Context, State } from "./types"

export const createContext = (settings: ReturnType<typeof createSettings>): Context => {
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
  const hasVerticalWriting$ = stateSubject.pipe(
    map((state) => state.hasVerticalWriting),
    filter(isDefined),
    distinctUntilChanged(),
  )
  const isUsingSpreadMode$ = stateSubject.pipe(
    map((state) => state.isUsingSpreadMode),
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

  const setState = (newState: Partial<ObservedValueOf<typeof stateSubject>>) => {
    const newCompleteState = { ...stateSubject.getValue(), ...newState }

    if (!isShallowEqual(newCompleteState, stateSubject.getValue())) {
      stateSubject.next(newCompleteState)
    }
  }

  const load: Context["load"] = (newManifest, newLoadOptions, settings) => {
    setState({
      manifest: newManifest,
      ...newLoadOptions,
      isFullyPrePaginated: isFullyPrePaginated(newManifest),
      isUsingSpreadMode: isUsingSpreadMode({
        manifest: newManifest,
        visibleAreaRect,
        forceSinglePageMode: settings.forceSinglePageMode,
      }),
    })
  }

  /**
   * RTL only makes sense for horizontal scrolling
   */
  const isRTL = () => {
    return stateSubject.getValue().manifest?.readingDirection === `rtl`
  }

  const setHasVerticalWriting = (value: boolean) =>
    setState({
      hasVerticalWriting: value,
    })

  const recomputeSettings$ = merge(hasVerticalWriting$, manifest$)

  recomputeSettings$
    .pipe(
      withLatestFrom(hasVerticalWriting$, manifest$),
      tap(([, hasVerticalWriting, manifest]) => {
        settings.recompute({ hasVerticalWriting, manifest })
      }),
      takeUntil(destroy$),
    )
    .subscribe()

  /**
   * Update state based on settings
   */
  settings.$.settings$
    .pipe(
      map(({ forceSinglePageMode }) => forceSinglePageMode),
      distinctUntilChanged(),
      withLatestFrom(manifest$),
      tap(([forceSinglePageMode, manifest]) => {
        setState({
          isUsingSpreadMode: isUsingSpreadMode({
            manifest,
            visibleAreaRect,
            forceSinglePageMode: forceSinglePageMode,
          }),
        })
      }),
      takeUntil(destroy$),
    )
    .subscribe()

  const destroy = () => {
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
    isUsingSpreadMode: () => stateSubject.getValue().isUsingSpreadMode,
    setHasVerticalWriting,
    setVisibleAreaRect: ({ height, width, x, y }: { x: number; y: number; width: number; height: number }) => {
      // visibleAreaRect.width = width - horizontalMargin * 2
      visibleAreaRect.width = width
      visibleAreaRect.height = height - marginTop - marginBottom
      visibleAreaRect.x = x
      visibleAreaRect.y = y

      const manifest = stateSubject.getValue().manifest

      if (manifest) {
        setState({
          isUsingSpreadMode: isUsingSpreadMode({
            manifest,
            visibleAreaRect,
            forceSinglePageMode: settings.getSettings().forceSinglePageMode,
          }),
        })
      }

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
        width: stateSubject.getValue().isUsingSpreadMode ? visibleAreaRect.width / 2 : visibleAreaRect.width,
        height: visibleAreaRect.height,
      }
    },
    containerElement$,
    isUsingSpreadMode$,
    hasVerticalWriting$,
    $: {
      manifest$,
      destroy$: destroy$.asObservable(),
      state$: stateSubject.asObservable(),
    },
  }
}

const areAllItemsPrePaginated = (manifest: Manifest | undefined) =>
  !manifest?.spineItems.some((item) => item.renditionLayout === `reflowable`)
