import { Fieldset, Stack } from "@chakra-ui/react"
import type { CoreInputSettings } from "@prose-reader/core"
import { memo } from "react"
import { useObserve } from "reactjrx"
import { combineLatest, map, NEVER } from "rxjs"
import { isKeyOf } from "../common/utils"
import { Radio, RadioGroup } from "../components/ui/radio"
import { useReader } from "../context/useReader"
import { SettingScopes } from "../settings/SettingScopes"
import { useManagedSetting } from "../settings/useManagedSetting"

const SPREAD_MODE_LABELS: Record<CoreInputSettings["spreadMode"], string> = {
  auto: "Automatic, from the screen and the book (default)",
  always: "Always two pages",
  never: "Always one page",
}

/**
 * The spread mode, a setting react-reader manages like the font scale: the
 * reader follows the app's value when it gives one, react-reader's own
 * otherwise.
 */
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
            scopeHelperText="The scope to which apply the spread for this book."
            activeScope={spreadMode.activeScope}
            onActiveScopeChange={spreadMode.onActiveScopeChange}
            renderScopeValue={(scope) => (
              <RadioGroup
                value={spreadMode.getValueForScope(scope)}
                disabled={!spreadState.isSpreadAllowed}
                onValueChange={function selectSpreadMode({ value }) {
                  if (value !== null && isKeyOf(SPREAD_MODE_LABELS, value)) {
                    spreadMode.changeValueForScope(scope, value)
                  }
                }}
              >
                <Stack gap={2}>
                  {Object.entries(SPREAD_MODE_LABELS).map(([mode, label]) => (
                    <Radio value={mode} key={mode}>
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
