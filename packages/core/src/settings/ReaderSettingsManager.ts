/* eslint-disable @typescript-eslint/no-empty-function */
import { Observable, Subject, combineLatest, merge } from "rxjs"
import { shareReplay, startWith, takeUntil, tap } from "rxjs/operators"
import { CoreInputSettings, ComputedCoreSettings, CoreOutputSettings } from "./types"
import { Context } from "../context/Context"
import { areAllItemsPrePaginated } from "../manifest/areAllItemsPrePaginated"
import { Report } from "../report"
import { SettingsInterface } from "./SettingsInterface"
import { isShallowEqual } from "../utils/objects"

export class ReaderSettingsManager implements SettingsInterface<CoreInputSettings, CoreOutputSettings> {
  #context: Context
  protected outputSettings: CoreOutputSettings
  protected outputSettingsUpdateSubject: Subject<CoreOutputSettings>

  public settings$: Observable<CoreOutputSettings>

  constructor(initialSettings: Partial<CoreInputSettings>, context: Context) {
    this.#context = context

    const settingsWithDefaults: CoreInputSettings = {
      ...this.getDefaultSettings(),
      ...initialSettings,
    }

    const outputSettings = this.getOutputSettings(settingsWithDefaults)

    this.outputSettings = outputSettings
    this.outputSettingsUpdateSubject = new Subject()

    this.settings$ = this.outputSettingsUpdateSubject.asObservable().pipe(startWith(this.settings), shareReplay(1))

    const recomputeSettingsOnContextChange$ = combineLatest([context.hasVerticalWriting$, context.manifest$]).pipe(
      tap(() => {
        this.update(this.settings)
      }),
    )

    /**
     * Update state based on settings
     */
    const updateContextOnSettingsChanges$ = this.settings$.pipe(
      tap(({ forceSinglePageMode }) => {
        context.update({ forceSinglePageMode })
      }),
    )

    merge(recomputeSettingsOnContextChange$, updateContextOnSettingsChanges$).pipe(takeUntil(context.destroy$)).subscribe()

    this.settings$.subscribe()
  }

  private getComputedSettings(settings: CoreInputSettings): ComputedCoreSettings {
    const manifest = this.#context.manifest
    const hasVerticalWriting = this.#context.state.hasVerticalWriting ?? false
    const computedSettings: ComputedCoreSettings = {
      computedPageTurnDirection: settings.pageTurnDirection,
      computedPageTurnAnimation: settings.pageTurnAnimation,
      computedPageTurnMode: `controlled`,
      computedPageTurnAnimationDuration: 0,
    }

    // We force scroll mode for some books
    if (manifest?.renditionFlow === `scrolled-continuous`) {
      computedSettings.computedPageTurnMode = `scrollable`
      computedSettings.computedPageTurnDirection = `vertical`
    } else if (
      manifest &&
      settings.pageTurnMode === `scrollable` &&
      (manifest.renditionLayout !== `pre-paginated` || !areAllItemsPrePaginated(manifest))
    ) {
      Report.warn(`pageTurnMode ${settings.pageTurnMode} incompatible with current book, switching back to default`)
      computedSettings.computedPageTurnAnimation = `none`
      computedSettings.computedPageTurnMode = `controlled`
    } else if (settings.pageTurnMode === `scrollable`) {
      computedSettings.computedPageTurnMode = `scrollable`
      computedSettings.computedPageTurnDirection = `vertical`
    }

    // some settings are not available for vertical writing
    if (hasVerticalWriting && computedSettings.computedPageTurnAnimation === `slide`) {
      Report.warn(
        `pageTurnAnimation ${computedSettings.computedPageTurnAnimation} incompatible with current book, switching back to default`,
      )
      computedSettings.computedPageTurnAnimation = `none`
    }

    // for now we only support animation none for scrollable
    if (computedSettings.computedPageTurnMode === `scrollable`) {
      computedSettings.computedPageTurnAnimationDuration = 0
      computedSettings.computedPageTurnAnimation = `none`
    } else {
      computedSettings.computedPageTurnAnimationDuration =
        settings.pageTurnAnimationDuration !== undefined ? settings.pageTurnAnimationDuration : 300
    }

    return computedSettings
  }

  _prepareUpdate(settings: Partial<CoreInputSettings>): {
    hasChanged: boolean
    state: CoreInputSettings & ComputedCoreSettings
    commit: () => void
  } {
    const state = this.getOutputSettings(settings)

    const hasChanged = !isShallowEqual(this.outputSettings, state)

    return {
      hasChanged: hasChanged,
      state,
      commit: () => {
        this.outputSettings = state

        if (hasChanged) {
          this.outputSettingsUpdateSubject.next(state)
        }
      },
    }
  }

  getOutputSettings(inputSettings: Partial<CoreInputSettings>): CoreInputSettings & ComputedCoreSettings {
    const computedSettings = this.getComputedSettings({ ...this.outputSettings, ...inputSettings })

    return { ...this.outputSettings, ...inputSettings, ...computedSettings }
  }

  getDefaultSettings() {
    return {
      forceSinglePageMode: false,
      pageTurnAnimation: `none` as const,
      //   computedPageTurnAnimation: `none`,
      pageTurnDirection: `horizontal` as const,
      //   computedPageTurnDirection: `horizontal`,
      pageTurnAnimationDuration: undefined,
      //   computedPageTurnAnimationDuration: 0,
      pageTurnMode: `controlled` as const,
      //   computedPageTurnMode: `controlled`,
      snapAnimationDuration: 300,
      navigationSnapThreshold: 0.3,
      numberOfAdjacentSpineItemToPreLoad: 0,
    }
  }

  public update(settings: Partial<CoreInputSettings>) {
    const { commit } = this._prepareUpdate(settings)

    commit()
  }

  get settings() {
    return this.outputSettings
  }

  public destroy() {
    this.outputSettingsUpdateSubject.complete()
  }
}
