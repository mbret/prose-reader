import type { Observable } from "rxjs"

/**
 * A default for every setting, `undefined` for an optional one: settings drop
 * a key their defaults lack.
 */
export type SettingsDefaults<Settings> = Settings &
  Record<keyof Settings, unknown>

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

  /**
   * Adds an enhancer's settings: the keys of `defaults`, each with the value
   * `settings` gives it, or its default when that value is `undefined`. The
   * other keys of `settings` are left out, so an enhancer passes the options
   * it was created with.
   *
   * Returns these settings, typed with the added ones.
   */
  extend<AddedSettings extends object>(
    defaults: SettingsDefaults<AddedSettings>,
    settings: Partial<AddedSettings>,
  ): SettingsInterface<
    InputSettings & AddedSettings,
    OutputSettings & AddedSettings
  >
}
