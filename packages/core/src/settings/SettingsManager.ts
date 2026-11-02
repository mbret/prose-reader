import { isShallowEqual } from "@prose-reader/shared"
import {
  type Observable,
  observeOn,
  queueScheduler,
  Subject,
  shareReplay,
} from "rxjs"
import { DestroyableClass } from "../utils/DestroyableClass"
import { watchKeys } from "../utils/rxjs"
import type {
  ExtendedSettings,
  SettingsDefaults,
  SettingsInterface,
} from "./SettingsInterface"

const mergeDefinedValuesIntoDeclaredSettings = <Settings extends object>(
  declaredSettings: Settings,
  settings: Partial<Settings>,
): Settings => {
  const mergedSettings = { ...declaredSettings }

  for (const key in declaredSettings) {
    const value = settings[key]

    if (value !== undefined) mergedSettings[key] = value
  }

  return mergedSettings
}

export abstract class SettingsManager<
    InputSettings extends Record<string, unknown>,
    ComputedSettings extends Record<string, unknown>,
  >
  extends DestroyableClass
  implements SettingsInterface<InputSettings, InputSettings & ComputedSettings>
{
  protected inputSettings: InputSettings
  protected outputSettings?: InputSettings & ComputedSettings
  private outputSettingsUpdateSubject: Subject<InputSettings & ComputedSettings>
  private outputSettings$: Observable<InputSettings & ComputedSettings>

  constructor(initialSettings: Partial<InputSettings>) {
    super()

    this.inputSettings = mergeDefinedValuesIntoDeclaredSettings<InputSettings>(
      this.getDefaultSettings(),
      initialSettings,
    )
    this.outputSettingsUpdateSubject = new Subject()

    this.outputSettings$ = this.outputSettingsUpdateSubject.asObservable().pipe(
      // An update made during a settings emission, of these settings or of
      // others, reaches the subscribers after that emission, so none of them
      // ends on the values it replaced.
      observeOn(queueScheduler),
      shareReplay(1),
    )

    this.outputSettings$.subscribe()
  }

  /**
   * Stores the settings before it emits them, so a subscriber that updates
   * the settings on an emission is not overwritten.
   */
  private commit(inputSettings: InputSettings) {
    const outputSettings = {
      ...inputSettings,
      ...this.getComputedSettings(inputSettings),
    }
    const hasChanged = !isShallowEqual(this.outputSettings, outputSettings)

    this.inputSettings = inputSettings
    this.outputSettings = outputSettings

    if (hasChanged) {
      this.outputSettingsUpdateSubject.next(outputSettings)
    }

    return outputSettings
  }

  /**
   * The settings computed from the input ones. The output settings are the
   * input ones, the ones `extend` added included, with these laid over them.
   */
  protected abstract getComputedSettings(
    inputSettings: InputSettings,
  ): ComputedSettings

  abstract getDefaultSettings(): SettingsDefaults<InputSettings>

  /**
   * Computes the settings again, for a computed setting that also depends on
   * something other than the input settings.
   */
  protected recompute() {
    this.commit(this.inputSettings)
  }

  public update(settings: Partial<InputSettings>) {
    this.commit(
      mergeDefinedValuesIntoDeclaredSettings(this.inputSettings, settings),
    )
  }

  public extend<
    Self extends SettingsInterface<
      InputSettings,
      InputSettings & ComputedSettings
    >,
    AddedSettings extends object,
  >(
    this: Self & this,
    defaults: SettingsDefaults<AddedSettings>,
    settings: Partial<AddedSettings>,
  ): ExtendedSettings<Self, AddedSettings> {
    const alreadyDeclaredSetting = Object.keys(defaults).find((key) =>
      Object.hasOwn(this.inputSettings, key),
    )

    if (alreadyDeclaredSetting !== undefined) {
      throw new Error(
        `The setting "${alreadyDeclaredSetting}" is already declared`,
      )
    }

    this.commit({
      ...this.inputSettings,
      ...mergeDefinedValuesIntoDeclaredSettings<AddedSettings>(
        defaults,
        settings,
      ),
    })

    // Cast: these settings now hold the added ones too, a change of type that
    // TypeScript cannot follow on `this`.
    return this as unknown as ExtendedSettings<Self, AddedSettings>
  }

  get values() {
    return this.outputSettings ?? this.commit(this.inputSettings)
  }

  get values$() {
    if (!this.outputSettings) {
      this.commit(this.inputSettings)
    }

    return this.outputSettings$
  }

  public watch<K extends keyof (InputSettings & ComputedSettings)>(keys: K[]) {
    return this.values$.pipe(watchKeys(keys))
  }

  public destroy() {
    super.destroy()
    this.outputSettingsUpdateSubject.complete()
  }
}
