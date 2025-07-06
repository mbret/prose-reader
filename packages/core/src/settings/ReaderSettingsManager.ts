import { takeUntil, tap } from "rxjs"
import type { Context } from "../context/Context"
import { Report } from "../report"
import { computeSpreadMode } from "./computeSpreadMode"
import type { SettingsInterface } from "./SettingsInterface"
import { SettingsManager } from "./SettingsManager"
import type {
  ComputedCoreSettings,
  CoreInputSettings,
  CoreOutputSettings,
} from "./types"

/**
 * @important If a settings needs to be derived from a sub component, it needs to live next to the said
 * component or pushed back into the context.
 */
export class ReaderSettingsManager
  extends SettingsManager<CoreInputSettings, CoreOutputSettings>
  implements SettingsInterface<CoreInputSettings, CoreOutputSettings>
{
  constructor(
    initialSettings: Partial<CoreInputSettings>,
    protected context: Context,
  ) {
    super(initialSettings)

    context
      .watch(["manifest", "hasVerticalWriting"])
      .pipe(
        tap(() => this.update(this.values)),
        takeUntil(this.destroy$),
      )
      .subscribe()
  }

  private getComputedSettings(
    settings: CoreInputSettings,
  ): ComputedCoreSettings {
    const manifest = this.context.manifest
    const hasVerticalWriting = this.context.value.hasVerticalWriting ?? false
    const computedSettings: ComputedCoreSettings = {
      computedPageTurnDirection: settings.pageTurnDirection,
      computedPageTurnAnimation: settings.pageTurnAnimation,
      computedPageTurnMode: settings.pageTurnMode,
      computedPageTurnAnimationDuration: 0,
      computedSpreadMode: computeSpreadMode({
        spreadMode: settings.spreadMode,
        manifest,
      }),
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
      spreadMode: false,
      pageTurnAnimation: `slide`,
      pageTurnDirection: `horizontal` as const,
      pageTurnAnimationDuration: undefined,
      pageTurnMode: `controlled` as const,
      snapAnimationDuration: 300,
      navigationSnapThreshold: { type: "pixels", value: 40 },
      numberOfAdjacentSpineItemToPreLoad: 3,
    } satisfies CoreInputSettings
  }
}
