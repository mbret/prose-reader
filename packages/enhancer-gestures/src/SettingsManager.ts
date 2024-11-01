import { Reader, SettingsManager } from "@prose-reader/core"
import { InputSettings, OutputSettings } from "./types"

export class GesturesSettingsManager extends SettingsManager<InputSettings, OutputSettings> {
  constructor(
    initialSettings: Partial<InputSettings>,
    private reader: Reader,
  ) {
    super(initialSettings)
  }

  getOutputSettings(inputSettings: InputSettings): OutputSettings {
    return {
      ...inputSettings,
      panNavigation:
        this.reader.settings.values.computedPageTurnMode === `scrollable` ? `pan` : inputSettings.panNavigation,
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
    }
  }
}
