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

  getCleanedParentInputSettings(
    settings: Partial<EnhancerThemeInputSettings & ParentInputSettings>,
  ): ParentInputSettings {
    const { theme: _unused, ...rest } = settings

    // Cast: removing a key from a generic type gives an `Omit` that TypeScript
    // cannot relate back to `ParentInputSettings`.
    return rest as unknown as ParentInputSettings
  }

  getDefaultSettings(): EnhancerThemeInputSettings {
    return {
      theme: `bright`,
    }
  }
}
