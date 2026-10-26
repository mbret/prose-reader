import { isShallowEqual, shallowMergeIfDefined } from "@prose-reader/shared"
import {
  distinctUntilChanged,
  type Observable,
  Subject,
  shareReplay,
} from "rxjs"
import { DestroyableClass } from "../utils/DestroyableClass"
import { mapKeysTo } from "../utils/rxjs"
import type { SettingsInterface } from "./SettingsInterface"

export abstract class SettingsManager<
    InputSettings extends object,
    OutputSettings extends Record<string, unknown>,
  >
  extends DestroyableClass
  implements SettingsInterface<InputSettings, OutputSettings>
{
  protected inputSettings: InputSettings
  protected outputSettings?: OutputSettings
  protected outputSettingsUpdateSubject: Subject<OutputSettings>

  public _settings$: Observable<OutputSettings>

  constructor(initialSettings: Partial<InputSettings>) {
    super()

    const settingsWithDefaults: InputSettings = {
      ...this.getDefaultSettings(),
      ...initialSettings,
    }

    this.inputSettings = settingsWithDefaults
    this.outputSettingsUpdateSubject = new Subject()

    this._settings$ = this.outputSettingsUpdateSubject
      .asObservable()
      .pipe(shareReplay(1))

    this._settings$.subscribe()
  }

  /**
   * Stores the settings before it emits them, so a subscriber that updates
   * the settings on an emission is not overwritten.
   */
  private commit(inputSettings: InputSettings) {
    const outputSettings = this.getOutputSettings(inputSettings)
    const hasChanged = !isShallowEqual(this.outputSettings, outputSettings)

    this.inputSettings = inputSettings
    this.outputSettings = outputSettings

    if (hasChanged) {
      this.outputSettingsUpdateSubject.next(outputSettings)
    }

    return outputSettings
  }

  abstract getOutputSettings(inputSettings: InputSettings): OutputSettings

  abstract getDefaultSettings(): InputSettings

  public update(settings: Partial<InputSettings>) {
    this.commit(shallowMergeIfDefined(this.inputSettings, settings))
  }

  get values() {
    return this.outputSettings ?? this.commit(this.inputSettings)
  }

  get values$() {
    if (!this.outputSettings) {
      this.commit(this.inputSettings)
    }

    return this._settings$
  }

  public watch<K extends keyof OutputSettings>(keys: K[]) {
    return this.values$.pipe(
      mapKeysTo(keys),
      distinctUntilChanged(isShallowEqual),
    )
  }

  public destroy() {
    super.destroy()
    this.outputSettingsUpdateSubject.complete()
  }
}
