import { type Reader, SettingsManager } from "@prose-reader/core"
import { takeUntil, tap } from "rxjs"
import type { InputSettings, OutputSettings } from "./types"

export class GesturesSettingsManager extends SettingsManager<
  InputSettings,
  Pick<OutputSettings, "panNavigation">
> {
  constructor(
    initialSettings: Partial<InputSettings>,
    private reader: Reader,
  ) {
    super(initialSettings)

    /**
     * Since we have settings that may be locked due to some reader settings
     * we need to update as soon as they update as well.
     */
    reader.settings.values$
      .pipe(
        tap(() => {
          this.recompute()
        }),
        takeUntil(this.destroy$),
      )
      .subscribe()
  }

  protected getComputedSettings(inputSettings: InputSettings) {
    return {
      panNavigation:
        this.reader.settings.values.computedPageTurnMode === `scrollable`
          ? false
          : inputSettings.panNavigation,
    }
  }

  getDefaultSettings(): InputSettings {
    return {
      panNavigation: "pan",
      pinchCancelPan: true,
      zoomMaxScale: Infinity,
      ignore: [],
    }
  }
}
