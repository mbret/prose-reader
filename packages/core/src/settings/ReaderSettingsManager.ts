import { combineLatest, merge } from "rxjs"
import { takeUntil, tap } from "rxjs/operators"
import type { Context } from "../context/Context"
import { Report } from "../report"
import type { SettingsInterface } from "./SettingsInterface"
import { SettingsManager } from "./SettingsManager"
import type {
  ComputedCoreSettings,
  CoreInputSettings,
  CoreOutputSettings,
} from "./types"

export class ReaderSettingsManager
  extends SettingsManager<CoreInputSettings, CoreOutputSettings>
  implements SettingsInterface<CoreInputSettings, CoreOutputSettings>
{
  constructor(
    initialSettings: Partial<CoreInputSettings>,
    protected context: Context,
  ) {
    super(initialSettings)

    const recomputeSettingsOnContextChange$ = combineLatest([
      context.hasVerticalWriting$,
      context.manifest$,
    ]).pipe(
      tap(() => {
        this.update(this.values)
      }),
    )

    /**
     * Update state based on settings
     */
    const updateContextOnSettingsChanges$ = this.values$.pipe(
      tap(({ forceSinglePageMode }) => {
        context.update({ forceSinglePageMode })
      }),
    )

    merge(recomputeSettingsOnContextChange$, updateContextOnSettingsChanges$)
      .pipe(takeUntil(context.destroy$))
      .subscribe()
  }

  private getComputedSettings(
    settings: CoreInputSettings,
  ): ComputedCoreSettings {
    const manifest = this.context.manifest
    const hasVerticalWriting = this.context.state.hasVerticalWriting ?? false
    const computedSettings: ComputedCoreSettings = {
      computedPageTurnDirection: settings.pageTurnDirection,
      computedPageTurnAnimation: settings.pageTurnAnimation,
      computedPageTurnMode: settings.pageTurnMode,
      computedPageTurnAnimationDuration: 0,
    }

    // We force scroll mode for some books
    if (manifest?.renditionFlow === `scrolled-continuous`) {
      computedSettings.computedPageTurnMode = `scrollable`
    }
    if (computedSettings.computedPageTurnMode === "scrollable") {
      computedSettings.computedPageTurnDirection = `vertical`
    }

    // some settings are not available for vertical writing
    if (
      hasVerticalWriting &&
      computedSettings.computedPageTurnAnimation === `slide`
    ) {
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
        settings.pageTurnAnimationDuration !== undefined
          ? settings.pageTurnAnimationDuration
          : 300
    }

    return computedSettings
  }

  getOutputSettings(
    inputSettings: CoreInputSettings,
  ): CoreInputSettings & ComputedCoreSettings {
    const computedSettings = this.getComputedSettings(inputSettings)

    return { ...this.outputSettings, ...inputSettings, ...computedSettings }
  }

  getDefaultSettings() {
    return {
      forceSinglePageMode: false,
      pageTurnAnimation: `slide`,
      pageTurnDirection: `horizontal` as const,
      pageTurnAnimationDuration: undefined,
      pageTurnMode: `controlled` as const,
      snapAnimationDuration: 300,
      navigationSnapThreshold: { type: "pixels", value: 80 },
      numberOfAdjacentSpineItemToPreLoad: 3,
    } satisfies CoreInputSettings
  }
}
