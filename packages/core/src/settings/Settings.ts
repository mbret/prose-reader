import { BehaviorSubject, combineLatest, merge } from "rxjs"
import { distinctUntilChanged, takeUntil, tap } from "rxjs/operators"
import { Manifest } from "../types"
import { isShallowEqual } from "../utils/objects"
import { InputSettings, OutputSettings } from "./types"
import { updateComputedSettings } from "./updateComputedSettings"
import { Context } from "../context/Context"

export type Settings = ReturnType<typeof createSettings>

export const createSettings = (initialSettings: Partial<InputSettings>, context: Context) => {
  const mergedSettings: OutputSettings = {
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
    navigationSnapThreshold: 0.3,
    numberOfAdjacentSpineItemToPreLoad: 0,
    ...initialSettings,
  }

  updateComputedSettings(undefined, mergedSettings, false)

  const settingsSubject$ = new BehaviorSubject(mergedSettings)

  const setSettings = (newSettings: Partial<InputSettings>) => {
    if (Object.keys(newSettings).length === 0) return

    const newMergedSettings = { ...settingsSubject$.value, ...newSettings }

    updateComputedSettings(context.manifest, newMergedSettings, context.state.hasVerticalWriting ?? false)

    settingsSubject$.next(newMergedSettings)
  }

  const recompute = (options: { hasVerticalWriting?: boolean; manifest?: Manifest | undefined }) => {
    const newMergedSettings = { ...settingsSubject$.value }

    updateComputedSettings(options.manifest, newMergedSettings, options.hasVerticalWriting ?? false)

    settingsSubject$.next(newMergedSettings)
  }

  const destroy = () => {
    settingsSubject$.complete()
  }

  const recomputeSettingsOnContextChange$ = combineLatest([context.hasVerticalWriting$, context.manifest$]).pipe(
    tap(([hasVerticalWriting, manifest]) => {
      recompute({ hasVerticalWriting, manifest })
    }),
  )

  /**
   * Update state based on settings
   */
  const updateContextOnSettingsChanges$ = settingsSubject$.pipe(
    tap(({ forceSinglePageMode }) => {
      context.update({ forceSinglePageMode })
    }),
  )

  merge(recomputeSettingsOnContextChange$, updateContextOnSettingsChanges$).pipe(takeUntil(context.destroy$)).subscribe()

  return {
    getSettings: () => settingsSubject$.value,
    setSettings,
    recompute,
    destroy,
    settings$: settingsSubject$.asObservable().pipe(distinctUntilChanged(isShallowEqual)),
  }
}
