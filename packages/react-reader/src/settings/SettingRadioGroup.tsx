import { Stack } from "@chakra-ui/react"
import { isKeyOf } from "../common/utils"
import { Radio, RadioGroup } from "../components/ui/radio"

/** A radio per value of a setting, with `labels` holding every value. */
export const SettingRadioGroup = <Value extends string>({
  labels,
  value,
  disabled,
  onValueChange,
}: {
  labels: Record<Value, string>
  value: Value | undefined
  disabled?: boolean
  onValueChange: (value: Value) => void
}) => (
  <RadioGroup
    value={value}
    disabled={disabled}
    onValueChange={function selectSettingValue({ value: selectedValue }) {
      if (selectedValue !== null && isKeyOf(labels, selectedValue)) {
        onValueChange(selectedValue)
      }
    }}
  >
    <Stack gap={2}>
      {Object.entries<string>(labels).map(([settingValue, label]) => (
        <Radio value={settingValue} key={settingValue}>
          {label}
        </Radio>
      ))}
    </Stack>
  </RadioGroup>
)
