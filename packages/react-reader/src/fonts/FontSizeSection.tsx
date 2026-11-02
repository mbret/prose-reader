import { Stack } from "@chakra-ui/react"
import { memo } from "react"
import { Checkbox } from "../components/ui/checkbox"
import { getInheritedChoiceLabel } from "../settings/getInheritedChoiceLabel"
import { SettingScopes } from "../settings/SettingScopes"
import { useManagedSetting } from "../settings/useManagedSetting"
import { FontScaleSlider } from "./FontScaleSlider"

const toFontScalePercentLabel = (fontScale: number) =>
  `${Math.round(fontScale * 100)}%`

/**
 * The font scale of each scope: the slider at the value it takes, and a
 * checkbox to set it back to the value it inherits. Unchecking the box keeps
 * the value shown as the scope's own.
 */
export const FontSizeSection = memo(function FontSizeSection() {
  const fontScale = useManagedSetting("fontScale")

  return (
    <Stack gap={4} flex={1}>
      <SettingScopes
        settingLabel="font size"
        activeScope={fontScale.activeScope}
        onActiveScopeChange={fontScale.onActiveScopeChange}
        renderScopeValue={(scope) => {
          const fontScaleOfScope = fontScale.getValueForScope(scope)
          const inheritedFontScale = fontScale.getInheritedValueForScope(scope)

          if (fontScaleOfScope === undefined) return null

          return (
            <Stack gap={4}>
              <Checkbox
                checked={fontScale.getOwnValueForScope(scope) === undefined}
                onCheckedChange={function changeToInheritedFontScale({
                  checked,
                }) {
                  fontScale.changeValueForScope(
                    scope,
                    checked === true ? undefined : fontScaleOfScope,
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
                fontScale={fontScaleOfScope}
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
