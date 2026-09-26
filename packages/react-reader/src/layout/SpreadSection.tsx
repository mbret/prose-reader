import { Fieldset, Stack } from "@chakra-ui/react"
import type { CoreInputSettings } from "@prose-reader/core"
import { memo, useCallback } from "react"
import { useLiveRef, useObserve } from "reactjrx"
import { combineLatest, map, NEVER } from "rxjs"
import { Radio, RadioGroup } from "../components/ui/radio"
import { useReader } from "../context/useReader"
import {
  useReaderContext,
  useReaderContextValue,
} from "../context/useReaderContext"
import { SettingScopes } from "../settings/SettingScopes"
import type { PROSE_REACT_READER_SETTINGS_SCOPE_REFERENCE } from "../settings/types"

const SPREAD_MODES: CoreInputSettings["spreadMode"][] = [
  "auto",
  "always",
  "never",
]

/**
 * The spread mode, managed like the font size: the app's value for each scope
 * when it passes them, react-reader's own copy otherwise, and the reader
 * follows it.
 */
export const SpreadSection = memo(() => {
  const reader = useReader()
  const context = useReaderContext()
  const {
    uncontrolledSpreadMode,
    spreadMode = uncontrolledSpreadMode,
    spreadModeScope,
    spreadModeValues,
    onSpreadModeChange,
    onSpreadModeScopeChange,
  } = useReaderContextValue([
    "uncontrolledSpreadMode",
    "spreadMode",
    "spreadModeScope",
    "spreadModeValues",
    "onSpreadModeChange",
    "onSpreadModeScopeChange",
  ])
  const onSpreadModeChangeRef = useLiveRef(onSpreadModeChange)
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

  const updateSpreadMode = useCallback(
    (
      scope: PROSE_REACT_READER_SETTINGS_SCOPE_REFERENCE,
      value: CoreInputSettings["spreadMode"],
    ) => {
      if (onSpreadModeChangeRef.current) {
        onSpreadModeChangeRef.current(scope, value)
      } else {
        context.update((old) => ({ ...old, uncontrolledSpreadMode: value }))
      }
    },
    [onSpreadModeChangeRef, context],
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
            activeScope={spreadModeScope}
            onActiveScopeChange={onSpreadModeScopeChange}
            renderScopeValue={(scope) => (
              <RadioGroup
                value={spreadModeValues?.[scope] ?? spreadMode}
                disabled={!spreadState.isSpreadAllowed}
                onValueChange={({ value }) => {
                  const selectedSpreadMode = SPREAD_MODES.find(
                    (mode) => mode === value,
                  )

                  if (selectedSpreadMode) {
                    updateSpreadMode(scope, selectedSpreadMode)
                  }
                }}
              >
                <Stack gap={2}>
                  <Radio value="auto">
                    Automatic, from the screen and the book (default)
                  </Radio>
                  <Radio value="always">Always two pages</Radio>
                  <Radio value="never">Always one page</Radio>
                </Stack>
              </RadioGroup>
            )}
          />
        </Stack>
      </Fieldset.Content>
    </Fieldset.Root>
  )
})
