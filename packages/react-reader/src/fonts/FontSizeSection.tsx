import { Stack } from "@chakra-ui/react"
import { memo } from "react"
import { Checkbox } from "../components/ui/checkbox"
import { getInheritedChoiceLabel } from "../settings/getInheritedChoiceLabel"
import { SettingScopes } from "../settings/SettingScopes"
import { useManagedSetting } from "../settings/useManagedSetting"
import { FontScaleSlider } from "./FontScaleSlider"

const toFontScalePercentLabel = (fontScale: number) =>
  `${Math.round(fontScale * 100)}%`

export const FontSizeSection = memo(function FontSizeSection() {
  const fontScale = useManagedSetting("fontScale")

  return (
    <Stack gap={4} flex={1}>
      <SettingScopes
        settingLabel="font size"
        activeScope={fontScale.activeScope}
        onActiveScopeChange={fontScale.onActiveScopeChange}
        renderScopeValue={(scope) => {
          const {
            ownValue: ownFontScale,
            inheritedValue: inheritedFontScale,
            appliedValue: appliedFontScale,
          } = fontScale.getValuesForScope(scope)

          if (appliedFontScale === undefined) return null

          return (
            <Stack gap={4}>
              <Checkbox
                checked={ownFontScale === undefined}
                onCheckedChange={function toggleInheritedFontScale({
                  checked,
                }) {
                  fontScale.changeValueForScope(
                    scope,
                    checked === true ? undefined : appliedFontScale,
                  )
                }}
              >
                {getInheritedChoiceLabel(
                  scope,
                  inheritedFontScale === undefined
                    ? undefined
                    : toFontScalePercentLabel(inheritedFontScale),
                )}
              </Checkbox>
              <FontScaleSlider
                fontScale={appliedFontScale}
                onFontScaleChange={function changeFontScale(changedFontScale) {
                  fontScale.changeValueForScope(scope, changedFontScale)
                }}
              />
            </Stack>
          )
        }}
      />
    </Stack>
  )
})
