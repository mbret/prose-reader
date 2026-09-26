import { Fieldset, Stack } from "@chakra-ui/react"
import type { CoreInputSettings } from "@prose-reader/core"
import { memo } from "react"
import { useObserve } from "reactjrx"
import { combineLatest, map, NEVER } from "rxjs"
import { Radio, RadioGroup } from "../components/ui/radio"
import { useReader } from "../context/useReader"

const SPREAD_MODES: CoreInputSettings["spreadMode"][] = [
  "auto",
  "always",
  "never",
]

/**
 * Sets the reader's `spreadMode` setting, which stays the only record of it:
 * the section shows what the reader has and writes back to it.
 */
export const SpreadSection = memo(() => {
  const reader = useReader()
  const { data: spread } = useObserve(
    () =>
      reader
        ? combineLatest([
            reader.settings.watch(["spreadMode"]),
            reader.viewport.watch("isSpread"),
            reader.context.watch("isSpreadAllowed"),
          ]).pipe(
            map(([{ spreadMode }, isSpread, isSpreadAllowed]) => ({
              spreadMode,
              isSpread,
              isSpreadAllowed,
            })),
          )
        : NEVER,
    [reader],
  )

  if (!spread) return null

  return (
    <Fieldset.Root>
      <Fieldset.Legend>Spread</Fieldset.Legend>
      <Fieldset.HelperText>
        {!spread.isSpreadAllowed
          ? "This book is never shown in a spread."
          : spread.isSpread
            ? "Two pages are shown side by side."
            : "One page is shown at a time."}
      </Fieldset.HelperText>
      <Fieldset.Content>
        <RadioGroup
          value={spread.spreadMode}
          disabled={!spread.isSpreadAllowed}
          onValueChange={(e) => {
            const value = SPREAD_MODES.find((mode) => mode === e.value)

            if (value) reader?.settings.update({ spreadMode: value })
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
      </Fieldset.Content>
    </Fieldset.Root>
  )
})
