import { Observable } from "rxjs"

export interface SettingsInterface<
  InputSettings,
  OutputSettings = Record<string, never>,
> {
  _outputSettings?: OutputSettings
  _inputSettings?: InputSettings

  _prepareUpdate(settings: Partial<InputSettings>): {
    hasChanged: boolean
    commit: () => OutputSettings
  }

  update(settings: Partial<InputSettings>): void

  values$: Observable<OutputSettings>

  values: OutputSettings
}
