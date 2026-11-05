import { Stack } from "@chakra-ui/react"
import { isKeyOf } from "../common/utils"
import { Radio, RadioGroup } from "../components/ui/radio"
import { getInheritedChoiceLabel } from "./getInheritedChoiceLabel"
import type { ReactReaderSettingsScopeReference } from "./types"

/** The radio value of the inherited choice, a value no setting takes. */
const INHERITED_CHOICE_RADIO_VALUE = "inherited"

/**
 * A scope's value for a setting: a radio for the value it inherits, then one
 * per value in `labels`. `onValueChange` reports the inherited choice as
 * `undefined`.
 */
export const SettingRadioGroup = <Value extends string>({
  labels,
  scope,
  values: { ownValue, inheritedValue },
  disabled,
  onValueChange,
}: {
  labels: Record<Value, string>
  scope: ReactReaderSettingsScopeReference
  values: { ownValue: Value | undefined; inheritedValue: Value | undefined }
  disabled?: boolean
  onValueChange: (value: Value | undefined) => void
}) => (
  <RadioGroup
    value={ownValue ?? INHERITED_CHOICE_RADIO_VALUE}
    disabled={disabled}
    onValueChange={function selectSettingValue({ value: selectedValue }) {
      if (selectedValue === INHERITED_CHOICE_RADIO_VALUE) {
        onValueChange(undefined)
      } else if (selectedValue !== null && isKeyOf(labels, selectedValue)) {
        onValueChange(selectedValue)
      }
    }}
  >
    <Stack gap={2}>
      <Radio value={INHERITED_CHOICE_RADIO_VALUE}>
        {getInheritedChoiceLabel(
          scope,
          inheritedValue === undefined ? undefined : labels[inheritedValue],
        )}
      </Radio>
      {Object.entries<string>(labels).map(([settingValue, label]) => (
        <Radio value={settingValue} key={settingValue}>
          {label}
        </Radio>
      ))}
    </Stack>
  </RadioGroup>
)
