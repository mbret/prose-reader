import { Fieldset, Stack } from "@chakra-ui/react"
import type { Theme } from "@prose-reader/core"
import { memo } from "react"
import { useObserve } from "reactjrx"
import { NEVER } from "rxjs"
import { isKeyOf } from "../common/utils"
import { Radio, RadioGroup } from "../components/ui/radio"
import { useReader } from "../context/useReader"
import { SettingScopes } from "../settings/SettingScopes"
import { useManagedSetting } from "../settings/useManagedSetting"

const THEME_LABELS: Record<Theme, string> = {
  bright: "Bright",
  sepia: "Sepia",
  night: "Night",
  publisher: "The book's own colors",
}

/**
 * The theme, a setting react-reader manages like the font scale: the reader
 * follows the app's value when it gives one, react-reader's own otherwise.
 */
export const ThemeSection = memo(function ThemeSection() {
  const reader = useReader()
  const theme = useManagedSetting("theme")
  const { data: isFullyPrePaginated } = useObserve(
    () => (reader ? reader.context.watch("isFullyPrePaginated") : NEVER),
    [reader],
  )

  return (
    <Fieldset.Root>
      {isFullyPrePaginated && (
        <Fieldset.HelperText>
          This book keeps its own colors. The theme only paints around its
          pages.
        </Fieldset.HelperText>
      )}
      <Fieldset.Content>
        <Stack gap={4}>
          <SettingScopes
            scopeHelperText="The scope to which apply the theme for this book."
            activeScope={theme.activeScope}
            onActiveScopeChange={theme.onActiveScopeChange}
            renderScopeValue={(scope) => (
              <RadioGroup
                value={theme.getValueForScope(scope)}
                onValueChange={function selectTheme({ value }) {
                  if (value !== null && isKeyOf(THEME_LABELS, value)) {
                    theme.changeValueForScope(scope, value)
                  }
                }}
              >
                <Stack gap={2}>
                  {Object.entries(THEME_LABELS).map(([themeName, label]) => (
                    <Radio value={themeName} key={themeName}>
                      {label}
                    </Radio>
                  ))}
                </Stack>
              </RadioGroup>
            )}
          />
        </Stack>
      </Fieldset.Content>
    </Fieldset.Root>
  )
})
