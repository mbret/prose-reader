import { InputSettings } from "./types"
import { SettingsManagerOverload } from "../../settings/SettingsManagerOverload"
import { isShallowEqual } from "../../utils/objects"
import { CoreInputSettings, CoreOutputSettings } from "../../settings/types"

export class SettingsManager<
  ParentInputSettings extends CoreInputSettings,
  ParentOutputSettings extends CoreOutputSettings,
> extends SettingsManagerOverload<
  InputSettings,
  InputSettings,
  ParentInputSettings,
  ParentOutputSettings
> {
  computeOutputSettings(): InputSettings {
    return this.inputSettings
  }

  hasSettingsChanged(newOutputSettings: InputSettings): boolean {
    return !isShallowEqual(this.outputSettings, newOutputSettings)
  }

  getCleanedParentInputSettings(
    settings: Partial<InputSettings & ParentInputSettings>,
  ): ParentInputSettings {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { fontJustification, fontScale, fontWeight, lineHeight, ...rest } =
      settings

    return rest as unknown as ParentInputSettings
  }

  getDefaultSettings(): InputSettings {
    return {
      fontScale: 1,
      fontWeight: "publisher",
      lineHeight: "publisher",
      fontJustification: "publisher",
    }
  }
}
