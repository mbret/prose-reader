import { Observable, Subject, combineLatest } from "rxjs"
import { map, shareReplay, startWith } from "rxjs/operators"
import { SettingsInterface } from "./SettingsInterface"
import { CoreInputSettings, CoreOutputSettings } from "./types"
import { shallowMergeIfDefined } from "../utils/objects"

export abstract class SettingsManagerOverload<
  InputSettings,
  OutputSettings,
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

  public settings$: Observable<ParentOutputSettings & OutputSettings>

  constructor(
    initialSettings: Partial<InputSettings>,
    settingsManager: SettingsInterface<
      ParentInputSettings,
      ParentOutputSettings
    >,
  ) {
    this.settingsManager = settingsManager

    const inputSettings = shallowMergeIfDefined(
      this.getDefaultSettings(),
      initialSettings,
    )

    this.outputSettings = this.computeOutputSettings(inputSettings)
    this.inputSettings = shallowMergeIfDefined(
      this.getDefaultSettings(),
      initialSettings,
    )
    this.outputSettingsUpdateSubject = new Subject()

    this.settings$ = combineLatest([
      this.settingsManager.settings$,
      this.outputSettingsUpdateSubject.pipe(startWith(this.outputSettings)),
    ]).pipe(
      map(([parentSettings, settings]) => ({ ...parentSettings, ...settings })),
      shareReplay(1),
    )

    this.settings$.subscribe()
  }

  abstract getDefaultSettings(): InputSettings

  abstract computeOutputSettings(inputSettings: InputSettings): OutputSettings

  /**
   * Returns true if both are equal
   */
  abstract hasSettingsChanged(newOutputSettings: OutputSettings): boolean

  abstract getCleanedParentInputSettings(
    settings: Partial<InputSettings & ParentInputSettings>,
  ): ParentInputSettings

  _prepareUpdate(settings: Partial<InputSettings & ParentInputSettings>): {
    hasChanged: boolean
    commit: () => OutputSettings & ParentOutputSettings
  } {
    const parentInputSettings = this.getCleanedParentInputSettings(settings)

    const parentManagerPreparedUpdate =
      this.settingsManager._prepareUpdate(parentInputSettings)

    const inputSettings = shallowMergeIfDefined(this.inputSettings, settings)

    const outputSettings = this.computeOutputSettings(inputSettings)
    const hasChanged = this.hasSettingsChanged(outputSettings)

    return {
      hasChanged: hasChanged || parentManagerPreparedUpdate.hasChanged,
      commit: () => {
        this.inputSettings = inputSettings
        this.outputSettings = outputSettings

        if (!parentManagerPreparedUpdate.hasChanged && hasChanged) {
          this.outputSettingsUpdateSubject.next(outputSettings)
        }

        const parentOutputSettings = parentManagerPreparedUpdate.commit()

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

  get settings(): ParentOutputSettings & OutputSettings {
    return {
      ...this.settingsManager.settings,
      ...this.outputSettings,
    }
  }

  public destroy() {
    this.outputSettingsUpdateSubject.complete()
  }
}