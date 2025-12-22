import { type Reader, SettingsManager } from "@prose-reader/core"
import { takeUntil, tap } from "rxjs"
import type { InputSettings, OutputSettings } from "./types"

export class GesturesSettingsManager extends SettingsManager<
  InputSettings,
  OutputSettings
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
          this.update({})
        }),
        takeUntil(this.destroy$),
      )
      .subscribe()
  }

  getOutputSettings(inputSettings: InputSettings): OutputSettings {
    return {
      ...inputSettings,
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
      fontScalePinchEnabled: true,
      fontScalePinchThrottleTime: 500,
      fontScaleMaxScale: 5,
      fontScaleMinScale: 0.2,
      zoomMaxScale: Infinity,
      ignore: [],
    }
  }
}
