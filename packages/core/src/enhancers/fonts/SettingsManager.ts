import { SettingsManagerOverload } from "../../settings/SettingsManagerOverload"
import type {
  CoreInputSettings,
  CoreOutputSettings,
} from "../../settings/types"
import { isShallowEqual } from "../../utils/objects"
import type { EnhancerFontsInputSettings } from "./types"

export class SettingsManager<
  ParentInputSettings extends CoreInputSettings,
  ParentOutputSettings extends CoreOutputSettings,
> extends SettingsManagerOverload<
  EnhancerFontsInputSettings,
  EnhancerFontsInputSettings,
  ParentInputSettings,
  ParentOutputSettings
> {
  computeOutputSettings(
    settings: EnhancerFontsInputSettings,
  ): EnhancerFontsInputSettings {
    return settings
  }

  hasSettingsChanged(newOutputSettings: EnhancerFontsInputSettings): boolean {
    return !isShallowEqual(this.outputSettings, newOutputSettings)
  }

  getCleanedParentInputSettings(
    settings: Partial<EnhancerFontsInputSettings & ParentInputSettings>,
  ): ParentInputSettings {
    const { fontJustification, fontScale, fontWeight, lineHeight, ...rest } =
      settings

    return rest as unknown as ParentInputSettings
  }

  getDefaultSettings(): EnhancerFontsInputSettings {
    return {
      fontScale: 1,
      fontWeight: "publisher",
      lineHeight: "publisher",
      fontJustification: "publisher",
    }
  }
}
