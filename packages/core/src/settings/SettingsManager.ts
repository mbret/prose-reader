import { BehaviorSubject, Observable, combineLatest, merge } from "rxjs"
import { distinctUntilChanged, takeUntil, tap } from "rxjs/operators"
import { isShallowEqual } from "../utils/objects"
import { Settings, ComputedSettings } from "./types"
import { getComputedSettings } from "./getComputedSettings"
import { Context } from "../context/Context"
import { defaultSettings } from "./defaultSettings"

export class SettingsManager {
  // @see https://github.com/microsoft/TypeScript/issues/17293
  _settingsSubject$: BehaviorSubject<ComputedSettings>
  // @see https://github.com/microsoft/TypeScript/issues/17293
  _context: Context

  public settings$: Observable<ComputedSettings>

  constructor(initialSettings: Partial<Settings>, context: Context) {
    this._context = context

    const settingsWithDefaults: Settings = {
      ...defaultSettings,
      ...initialSettings,
    }

    const computedSettings = getComputedSettings(settingsWithDefaults, context)

    const settings = { ...settingsWithDefaults, ...computedSettings }

    this._settingsSubject$ = new BehaviorSubject(settings)

    this.settings$ = this._settingsSubject$.asObservable().pipe(distinctUntilChanged(isShallowEqual))

    const recomputeSettingsOnContextChange$ = combineLatest([context.hasVerticalWriting$, context.manifest$]).pipe(
      tap(() => {
        this._updateSettings(this.settings)
      }),
    )

    /**
     * Update state based on settings
     */
    const updateContextOnSettingsChanges$ = this._settingsSubject$.pipe(
      tap(({ forceSinglePageMode }) => {
        context.update({ forceSinglePageMode })
      }),
    )

    merge(recomputeSettingsOnContextChange$, updateContextOnSettingsChanges$).pipe(takeUntil(context.destroy$)).subscribe()
  }

  // @see https://github.com/microsoft/TypeScript/issues/17293
  _updateSettings(settings: Settings) {
    const computed = getComputedSettings(settings, this._context)
    const newMergedSettings = { ...settings, ...computed }

    this._settingsSubject$.next(newMergedSettings)
  }

  public setSettings(settings: Partial<Settings>) {
    if (Object.keys(settings).length === 0) return

    const newMergedSettings = { ...this._settingsSubject$.value, ...settings }

    this._updateSettings(newMergedSettings)
  }

  get settings() {
    return this._settingsSubject$.getValue()
  }

  public destroy() {
    this._settingsSubject$.complete()
  }
}
