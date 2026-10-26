import { isShallowEqual, shallowMergeIfDefined } from "@prose-reader/shared"
import {
  distinctUntilChanged,
  map,
  merge,
  type Observable,
  type ObservedValueOf,
  Subject,
  shareReplay,
} from "rxjs"
import { watchKeys } from "../utils/rxjs"
import type { SettingsInterface } from "./SettingsInterface"
import type { CoreInputSettings, CoreOutputSettings } from "./types"

/**
 * Adds an enhancer's settings to those of the settings manager it wraps, its
 * parent. Its own settings are the keys of `getDefaultSettings()`: an update
 * keeps those and hands every other key to the parent.
 */
export abstract class SettingsManagerOverload<
  InputSettings extends object,
  OutputSettings extends object,
  ParentInputSettings extends CoreInputSettings,
  ParentOutputSettings extends CoreOutputSettings,
> implements
    SettingsInterface<
      InputSettings & ParentInputSettings,
      OutputSettings & ParentOutputSettings
    >
{
  protected inputSettings: InputSettings
  protected outputSettings: OutputSettings
  protected outputSettingsUpdateSubject: Subject<OutputSettings>
  protected settingsManager: SettingsInterface<
    ParentInputSettings,
    ParentOutputSettings
  >

  public values$: Observable<ParentOutputSettings & OutputSettings>

  constructor(
    initialSettings: Partial<InputSettings>,
    settingsManager: SettingsInterface<
      ParentInputSettings,
      ParentOutputSettings
    >,
  ) {
    this.settingsManager = settingsManager
    this.inputSettings = shallowMergeIfDefined(
      this.getDefaultSettings(),
      initialSettings,
    )
    this.outputSettings = this.computeOutputSettings(this.inputSettings)
    this.outputSettingsUpdateSubject = new Subject()

    /**
     * An update commits every layer before any of them emits, so the values
     * read on an emission are the ones the whole update left.
     */
    this.values$ = merge(
      this.settingsManager.values$,
      this.outputSettingsUpdateSubject,
    ).pipe(
      map(() => this.values),
      shareReplay(1),
    )

    this.values$.subscribe()
  }

  abstract getDefaultSettings(): InputSettings

  abstract computeOutputSettings(inputSettings: InputSettings): OutputSettings

  /**
   * Whether `newOutputSettings` differs from the output settings held now.
   */
  abstract hasSettingsChanged(newOutputSettings: OutputSettings): boolean

  _prepareUpdate(settings: Partial<InputSettings & ParentInputSettings>): {
    hasChanged: boolean
    commit: () => OutputSettings & ParentOutputSettings
  } {
    const ownSettingsKeys = Object.keys(this.getDefaultSettings())
    const settingsEntries = Object.entries(settings)
    // Cast: entries keep no key type, and the keys of the default settings
    // are the keys of `InputSettings`.
    const ownSettings = Object.fromEntries(
      settingsEntries.filter(([key]) => ownSettingsKeys.includes(key)),
    ) as Partial<InputSettings>
    // Cast: same reason, for the keys this manager hands to its parent.
    const parentSettings = Object.fromEntries(
      settingsEntries.filter(([key]) => !ownSettingsKeys.includes(key)),
    ) as Partial<ParentInputSettings>

    const parentManagerPreparedUpdate =
      this.settingsManager._prepareUpdate(parentSettings)

    const inputSettings = shallowMergeIfDefined(this.inputSettings, ownSettings)

    const outputSettings = this.computeOutputSettings(inputSettings)
    const hasChanged = this.hasSettingsChanged(outputSettings)

    return {
      hasChanged: hasChanged || parentManagerPreparedUpdate.hasChanged,
      commit: () => {
        this.inputSettings = inputSettings
        this.outputSettings = outputSettings

        const parentOutputSettings = parentManagerPreparedUpdate.commit()
        const isEmittedByParent = parentManagerPreparedUpdate.hasChanged

        if (hasChanged && !isEmittedByParent) {
          this.outputSettingsUpdateSubject.next(outputSettings)
        }

        return {
          ...parentOutputSettings,
          ...outputSettings,
        }
      },
    }
  }

  public update(settings: Partial<InputSettings & ParentInputSettings>) {
    const { commit } = this._prepareUpdate(settings)

    commit()
  }

  get values(): ParentOutputSettings & OutputSettings {
    return {
      ...this.settingsManager.values,
      ...this.outputSettings,
    }
  }
  public watch<K extends keyof ObservedValueOf<typeof this.values$>>(
    key: K,
  ): Observable<(ParentOutputSettings & OutputSettings)[K]>
  public watch<K extends keyof ObservedValueOf<typeof this.values$>>(
    keys: K[],
  ): Observable<Pick<ParentOutputSettings & OutputSettings, K>>
  public watch<K extends keyof ObservedValueOf<typeof this.values$>>(
    keyOrKeys: K | K[],
  ) {
    if (Array.isArray(keyOrKeys)) {
      return this.values$.pipe(watchKeys(keyOrKeys))
    }

    return this.values$.pipe(
      map((result) => result[keyOrKeys]),
      distinctUntilChanged(isShallowEqual),
    )
  }

  public destroy() {
    this.outputSettingsUpdateSubject.complete()
  }
}
