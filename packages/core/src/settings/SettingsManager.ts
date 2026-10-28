import { isShallowEqual } from "@prose-reader/shared"
import {
  distinctUntilChanged,
  type Observable,
  observeOn,
  queueScheduler,
  Subject,
  shareReplay,
} from "rxjs"
import { DestroyableClass } from "../utils/DestroyableClass"
import { mapKeysTo } from "../utils/rxjs"
import type { SettingsDefaults, SettingsInterface } from "./SettingsInterface"

const mergeDefinedValuesIntoDeclaredSettings = <Settings extends object>(
  declaredSettings: Settings,
  settings: Partial<Settings>,
): Settings => ({
  ...declaredSettings,
  ...Object.fromEntries(
    Object.entries(settings).filter(
      ([key, value]) =>
        Object.hasOwn(declaredSettings, key) && value !== undefined,
    ),
  ),
})

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

    this.inputSettings = mergeDefinedValuesIntoDeclaredSettings<InputSettings>(
      this.getDefaultSettings(),
      initialSettings,
    )
    this.outputSettingsUpdateSubject = new Subject()

    this._settings$ = this.outputSettingsUpdateSubject.asObservable().pipe(
      // An update made on an emission reaches every subscriber after that
      // emission, so none of them ends on the values it replaced.
      observeOn(queueScheduler),
      shareReplay(1),
    )

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

  /**
   * Every input setting, the ones `extend` added included, with the ones
   * computed from them.
   */
  abstract getOutputSettings(inputSettings: InputSettings): OutputSettings

  abstract getDefaultSettings(): SettingsDefaults<InputSettings>

  public update(settings: Partial<InputSettings>) {
    this.commit(
      mergeDefinedValuesIntoDeclaredSettings(this.inputSettings, settings),
    )
  }

  public extend<AddedSettings extends object>(
    defaults: SettingsDefaults<AddedSettings>,
    settings: Partial<AddedSettings>,
  ) {
    this.commit({
      ...this.inputSettings,
      ...mergeDefinedValuesIntoDeclaredSettings<AddedSettings>(
        defaults,
        settings,
      ),
    })

    // Cast: these settings now hold the added ones too, a change of type that
    // TypeScript cannot follow on `this`.
    return this as unknown as SettingsInterface<
      InputSettings & AddedSettings,
      OutputSettings & AddedSettings
    >
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
