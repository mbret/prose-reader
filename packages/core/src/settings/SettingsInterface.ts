import { Observable } from "rxjs"

export interface SettingsInterface<
  InputSettings,
  OutputSettings = Record<string, never>,
> {
  _outputSettings?: OutputSettings
  _inputSettings?: InputSettings

  _prepareUpdate(settings: Partial<InputSettings>): {
    hasChanged: boolean
    commit: () => void
  }

  update(settings: Partial<InputSettings>): void

  settings$: Observable<OutputSettings>

  settings: OutputSettings
}
