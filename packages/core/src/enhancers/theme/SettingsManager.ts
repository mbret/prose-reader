import { SettingsManagerOverload } from "../../settings/SettingsManagerOverload"
import type {
  CoreInputSettings,
  CoreOutputSettings,
} from "../../settings/types"
import { isShallowEqual } from "../../utils/objects"
import type { EnhancerThemeInputSettings } from "./types"

export class SettingsManager<
  ParentInputSettings extends CoreInputSettings,
  ParentOutputSettings extends CoreOutputSettings,
> extends SettingsManagerOverload<
  EnhancerThemeInputSettings,
  EnhancerThemeInputSettings,
  ParentInputSettings,
  ParentOutputSettings
> {
  computeOutputSettings(
    settings: EnhancerThemeInputSettings,
  ): EnhancerThemeInputSettings {
    return settings
  }

  hasSettingsChanged(newOutputSettings: EnhancerThemeInputSettings): boolean {
    return !isShallowEqual(this.outputSettings, newOutputSettings)
  }

  getDefaultSettings(): EnhancerThemeInputSettings {
    return {
      theme: `bright`,
    }
  }
}
