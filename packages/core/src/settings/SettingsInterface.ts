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
   * it was created with. Throws when one of the keys is already declared.
   *
   * Returns these settings, typed as the settings it is called on with the
   * added ones. In an enhancer, call it on `reader.settings` held in a
   * variable typed `InheritOutput["settings"]`: TypeScript types
   * `reader.settings` itself from the constraint of `InheritOutput`, which
   * leaves out the settings that the enhancers below added.
   */
  extend<
    Self extends SettingsInterface<InputSettings, OutputSettings>,
    AddedSettings extends object,
  >(
    this: Self,
    defaults: SettingsDefaults<AddedSettings>,
    settings: Partial<AddedSettings>,
  ): ExtendedSettings<Self, AddedSettings>
}

/**
 * `Settings` with `AddedSettings` added to them, as `extend` returns them.
 */
export type ExtendedSettings<Settings, AddedSettings> =
  Settings extends SettingsInterface<infer InputSettings, infer OutputSettings>
    ? SettingsInterface<
        InputSettings & AddedSettings,
        OutputSettings & AddedSettings
      >
    : never
