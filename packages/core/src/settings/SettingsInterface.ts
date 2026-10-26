import type { Observable } from "rxjs"

export interface SettingsInterface<
  InputSettings,
  OutputSettings = Record<string, never>,
> {
  _outputSettings?: OutputSettings
  _inputSettings?: InputSettings

  update(settings: Partial<InputSettings>): void

  values$: Observable<OutputSettings>

  values: OutputSettings

  watch<K extends keyof OutputSettings>(
    keys: K[],
  ): Observable<Pick<OutputSettings, K>>
}
