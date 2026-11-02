import type { ReactReaderSettingsScopeReference } from "./types"

/**
 * The label of the choice that sets a scope back to the value it inherits,
 * naming that value once it is known.
 */
export const getInheritedChoiceLabel = (
  scope: ReactReaderSettingsScopeReference,
  inheritedValueLabel: string | undefined,
) => {
  const inheritedChoiceName = scope === "global" ? "Default" : "Same as global"

  return inheritedValueLabel === undefined
    ? inheritedChoiceName
    : `${inheritedChoiceName} (${inheritedValueLabel})`
}
