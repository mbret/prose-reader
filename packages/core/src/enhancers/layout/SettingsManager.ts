import { SettingsManagerOverload } from "../../settings/SettingsManagerOverload"
import type {
  CoreInputSettings,
  CoreOutputSettings,
} from "../../settings/types"
import { isShallowEqual } from "../../utils/objects"
import type { EnhancerLayoutInputSettings, OutputSettings } from "./types"

export class SettingsManager<
  ParentInputSettings extends CoreInputSettings,
  ParentOutputSettings extends CoreOutputSettings,
> extends SettingsManagerOverload<
  EnhancerLayoutInputSettings,
  OutputSettings,
  ParentInputSettings,
  ParentOutputSettings
> {
  computeOutputSettings(
    inputSettings: EnhancerLayoutInputSettings,
  ): EnhancerLayoutInputSettings {
    return inputSettings
  }

  hasSettingsChanged(newOutputSettings: EnhancerLayoutInputSettings): boolean {
    return !isShallowEqual(this.outputSettings, newOutputSettings)
  }

  getCleanedParentInputSettings(
    settings: Partial<EnhancerLayoutInputSettings & ParentInputSettings>,
  ): ParentInputSettings {
    const {
      layoutAutoResize: _unused1,
      pageHorizontalMargin: _unused2,
      pageVerticalMargin: _unused3,
      layoutLayerTransition: _unused4,
      ...rest
    } = settings

    return rest as unknown as ParentInputSettings
  }

  getDefaultSettings(): EnhancerLayoutInputSettings {
    return {
      layoutAutoResize: "container",
      pageHorizontalMargin: 24,
      pageVerticalMargin: 24,
      layoutLayerTransition: true,
    }
  }
}
