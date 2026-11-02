import { Fieldset, Stack } from "@chakra-ui/react"
import type { CoreInputSettings } from "@prose-reader/core"
import { memo } from "react"
import { useObserve } from "reactjrx"
import { combineLatest, map, NEVER } from "rxjs"
import { useReader } from "../context/useReader"
import { SettingRadioGroup } from "../settings/SettingRadioGroup"
import { SettingScopes } from "../settings/SettingScopes"
import { useManagedSetting } from "../settings/useManagedSetting"

const SPREAD_MODE_LABELS: Record<CoreInputSettings["spreadMode"], string> = {
  auto: "Automatic, from the screen and the book",
  always: "Always two pages",
  never: "Always one page",
}

export const SpreadSection = memo(() => {
  const reader = useReader()
  const spreadMode = useManagedSetting("spreadMode")
  const { data: spreadState } = useObserve(
    () =>
      reader
        ? combineLatest([
            reader.viewport.watch("isSpread"),
            reader.context.watch("isSpreadAllowed"),
          ]).pipe(
            map(([isSpread, isSpreadAllowed]) => ({
              isSpread,
              isSpreadAllowed,
            })),
          )
        : NEVER,
    [reader],
  )

  if (!spreadState) return null

  return (
    <Fieldset.Root>
      <Fieldset.Legend>Spread</Fieldset.Legend>
      <Fieldset.HelperText>
        {!spreadState.isSpreadAllowed
          ? "This book is never shown in a spread."
          : spreadState.isSpread
            ? "Two pages are shown side by side."
            : "One page is shown at a time."}
      </Fieldset.HelperText>
      <Fieldset.Content>
        <Stack gap={4}>
          <SettingScopes
            settingLabel="spread"
            activeScope={spreadMode.activeScope}
            onActiveScopeChange={spreadMode.onActiveScopeChange}
            renderScopeValue={(scope) => (
              <SettingRadioGroup
                labels={SPREAD_MODE_LABELS}
                scope={scope}
                values={spreadMode.getValuesForScope(scope)}
                disabled={!spreadState.isSpreadAllowed}
                onValueChange={function changeSpreadMode(selectedSpreadMode) {
                  spreadMode.changeValueForScope(scope, selectedSpreadMode)
                }}
              />
            )}
          />
        </Stack>
      </Fieldset.Content>
    </Fieldset.Root>
  )
})
