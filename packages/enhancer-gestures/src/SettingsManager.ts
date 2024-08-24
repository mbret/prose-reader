import { SettingsManager } from "@prose-reader/core"
import { InputSettings, OutputSettings } from "./types"

export class GesturesSettingsManager extends SettingsManager<InputSettings, OutputSettings> {
  getOutputSettings(inputSettings: InputSettings): OutputSettings {
    return inputSettings
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
