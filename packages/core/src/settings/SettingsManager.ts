/* eslint-disable @typescript-eslint/no-empty-function */
import { Observable, Subject } from "rxjs"
import { shareReplay } from "rxjs/operators"
import { SettingsInterface } from "./SettingsInterface"
import { isShallowEqual, shallowMergeIfDefined } from "@prose-reader/shared"
import { DestroyableClass } from "../utils/DestroyableClass"

export abstract class SettingsManager<InputSettings, OutputSettings>
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

  _prepareUpdate(settings: Partial<InputSettings>): {
    hasChanged: boolean
    state: OutputSettings
    commit: () => OutputSettings
  } {
    const newInputSettings = shallowMergeIfDefined(this.inputSettings, settings)

    const state = this.getOutputSettings(newInputSettings)

    const hasChanged = !isShallowEqual(this.outputSettings, state)

    return {
      hasChanged: hasChanged,
      state,
      commit: () => {
        this.inputSettings = newInputSettings
        this.outputSettings = state

        if (hasChanged) {
          this.outputSettingsUpdateSubject.next(state)
        }

        return state
      },
    }
  }

  abstract getOutputSettings(inputSettings: InputSettings): OutputSettings

  abstract getDefaultSettings(): InputSettings

  public update(settings: Partial<InputSettings>) {
    const { commit } = this._prepareUpdate(settings)

    commit()
  }

  get values() {
    if (!this.outputSettings) {
      const { commit } = this._prepareUpdate(this.inputSettings)

      return commit()
    }

    return this.outputSettings
  }

  get values$() {
    if (!this.outputSettings) {
      const { commit } = this._prepareUpdate(this.inputSettings)

      commit()
    }

    return this._settings$
  }

  public destroy() {
    super.destroy()
    this.outputSettingsUpdateSubject.complete()
  }
}
