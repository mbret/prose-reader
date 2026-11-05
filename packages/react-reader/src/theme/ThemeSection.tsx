import { Fieldset, Stack } from "@chakra-ui/react"
import type { Theme } from "@prose-reader/core"
import { memo } from "react"
import { useReader } from "../context/useReader"
import { SettingRadioGroup } from "../settings/SettingRadioGroup"
import { SettingScopes } from "../settings/SettingScopes"
import { useManagedSetting } from "../settings/useManagedSetting"

const THEME_LABELS: Record<Theme, string> = {
  bright: "Bright",
  sepia: "Sepia",
  night: "Night",
  publisher: "The book's own colors",
}

export const ThemeSection = memo(function ThemeSection() {
  const reader = useReader()
  const theme = useManagedSetting("theme")
  const isFullyPrePaginated = reader?.context.value.isFullyPrePaginated

  return (
    <Fieldset.Root>
      {isFullyPrePaginated && (
        <Fieldset.HelperText>
          This book keeps its own colors. The theme only changes the background
          behind its pages.
        </Fieldset.HelperText>
      )}
      <Fieldset.Content>
        <Stack gap={4}>
          <SettingScopes
            settingLabel="theme"
            activeScope={theme.activeScope}
            onActiveScopeChange={theme.onActiveScopeChange}
            renderScopeValue={(scope) => (
              <SettingRadioGroup
                labels={THEME_LABELS}
                scope={scope}
                values={theme.getValuesForScope(scope)}
                onValueChange={function changeTheme(selectedTheme) {
                  theme.changeValueForScope(scope, selectedTheme)
                }}
              />
            )}
          />
        </Stack>
      </Fieldset.Content>
    </Fieldset.Root>
  )
})
