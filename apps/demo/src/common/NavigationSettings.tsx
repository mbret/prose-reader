import { Fieldset, HStack, Stack } from "@chakra-ui/react"
import type React from "react"
import { useObserve } from "reactjrx"
import { Checkbox } from "../components/ui/checkbox"
import { Field } from "../components/ui/field"
import { Radio, RadioGroup } from "../components/ui/radio"
import { Slider } from "../components/ui/slider"
import { useReaderSettings } from "../reader/settings/useReaderSettings"
import type { LocalSettings } from "../reader/settings/useSettings"
import { useReader } from "../reader/useReader"

export const NavigationSettings = ({
  localSettings,
  setLocalSettings,
}: {
  localSettings: LocalSettings
  setLocalSettings: React.Dispatch<React.SetStateAction<LocalSettings>>
}) => {
  const settings = useReaderSettings()
  const { reader } = useReader()
  const readerState = useObserve(() => reader?.features, [reader])
  const onlySupportScrollableMode =
    readerState?.supportedPageTurnMode.length === 1 &&
    readerState.supportedPageTurnMode[0] === `scrollable`

  return (
    <>
      <Fieldset.Root>
        <Fieldset.Legend>Gestures</Fieldset.Legend>
        <Fieldset.Content>
          <RadioGroup
            defaultValue={localSettings.navigationGestures}
            onValueChange={(e) => {
              setLocalSettings((state) => ({
                ...state,
                navigationGestures:
                  e.value as LocalSettings["navigationGestures"],
              }))
            }}
            value={localSettings.navigationGestures}
          >
            <HStack gap="24px">
              <Radio
                value="none"
                disabled={
                  onlySupportScrollableMode ||
                  !readerState?.supportedPageTurnAnimation.includes(`none`)
                }
              >
                None (only taps)
              </Radio>
              <Radio
                value="pan"
                disabled={settings?.computedPageTurnMode === "scrollable"}
              >
                Pan
              </Radio>
              <Radio
                value="swipe"
                disabled={settings?.computedPageTurnMode === "scrollable"}
              >
                Swipe
              </Radio>
            </HStack>
          </RadioGroup>
          <Field
            label={`Snap threshold (${localSettings.navigationSnapThreshold?.value ?? reader?.settings.values.navigationSnapThreshold.value ?? 100}px)`}
            helperTextPosition="top"
            helperText="The threshold for which the next or previous page is detected when panning"
          >
            <Stack
              direction="row"
              gap={4}
              paddingLeft={2}
              alignItems="center"
              width="100%"
              maxWidth="300px"
            >
              <Slider
                flex={1}
                value={[
                  localSettings.navigationSnapThreshold?.value ??
                    reader?.settings.values.navigationSnapThreshold.value ??
                    100,
                ]}
                max={500}
                min={20}
                step={5}
                marks={[
                  { value: 40, label: `40px (default)` },
                  { value: 250, label: `250px` },
                  {
                    value: 500,
                    label: `500px`,
                  },
                ]}
                onValueChange={(e) => {
                  const value = e.value[0] ?? 0

                  setLocalSettings((state) => ({
                    ...state,
                    navigationSnapThreshold: { type: "pixels", value },
                  }))
                }}
                onValueChangeEnd={() => {
                  reader?.settings.update({
                    navigationSnapThreshold: {
                      type: "pixels",
                      value:
                        localSettings.navigationSnapThreshold?.value ?? 100,
                    },
                  })
                }}
              />
            </Stack>
          </Field>
        </Fieldset.Content>
      </Fieldset.Root>
      <Fieldset.Root>
        <Fieldset.Legend>Turning animation</Fieldset.Legend>
        <Fieldset.Content>
          <RadioGroup
            defaultValue={settings?.computedPageTurnAnimation}
            onValueChange={(e) => {
              reader?.settings.update({
                pageTurnAnimation: e.value as NonNullable<
                  typeof settings
                >["computedPageTurnAnimation"],
                pageTurnMode: `controlled`,
              })
            }}
            value={settings?.computedPageTurnAnimation}
          >
            <HStack gap="24px">
              <Radio
                value="none"
                disabled={
                  onlySupportScrollableMode ||
                  !readerState?.supportedPageTurnAnimation.includes(`none`)
                }
              >
                none
              </Radio>
              <Radio
                value="fade"
                disabled={
                  onlySupportScrollableMode ||
                  !readerState?.supportedPageTurnAnimation.includes(`fade`)
                }
              >
                fade
              </Radio>
              <Radio
                value="slide"
                disabled={
                  onlySupportScrollableMode ||
                  !readerState?.supportedPageTurnAnimation.includes(`slide`)
                }
              >
                slide
              </Radio>
            </HStack>
          </RadioGroup>
        </Fieldset.Content>
      </Fieldset.Root>
      <Fieldset.Root>
        <Fieldset.Legend>Style</Fieldset.Legend>
        <Fieldset.Content>
          <Stack>
            <Field>
              <Checkbox
                disabled={
                  !readerState?.supportedPageTurnMode.includes(`scrollable`) ||
                  (readerState?.supportedPageTurnMode.includes(`scrollable`) &&
                    readerState?.supportedPageTurnMode.length === 1)
                }
                checked={settings?.computedPageTurnMode === `scrollable`}
                defaultChecked={settings?.computedPageTurnMode === `scrollable`}
                onCheckedChange={(e) => {
                  reader?.settings.update({
                    pageTurnMode: e.checked ? `scrollable` : `controlled`,
                  })
                }}
              >
                Enable scroll
              </Checkbox>
            </Field>
            <Field>
              <Checkbox
                disabled={
                  !readerState?.supportedPageTurnDirection.includes(
                    `vertical`,
                  ) ||
                  (readerState?.supportedPageTurnDirection.includes(
                    `vertical`,
                  ) &&
                    readerState?.supportedPageTurnDirection.length === 1)
                }
                checked={settings?.computedPageTurnDirection === `vertical`}
                defaultChecked={
                  settings?.computedPageTurnDirection === `vertical`
                }
                onCheckedChange={(e) => {
                  reader?.settings.update({
                    pageTurnDirection: e.checked ? `vertical` : `horizontal`,
                  })
                }}
              >
                Vertical mode
              </Checkbox>
            </Field>
          </Stack>
        </Fieldset.Content>
      </Fieldset.Root>
    </>
  )
}
