import type React from "react"
import { Box, Fieldset, Stack } from "@chakra-ui/react"
import { useReaderSettings } from "./useReaderSettings"
import type { LocalSettings } from "../reader/settings/useLocalSettings"
import { useReader } from "../reader/useReader"
import { useObserve } from "reactjrx"
import { Checkbox } from "../components/ui/checkbox"
import { Field } from "../components/ui/field"
import { Radio, RadioGroup } from "../components/ui/radio"

export const NavigationSettings = ({
  localSettings,
  setLocalSettings,
}: {
  localSettings: LocalSettings
  setLocalSettings: React.Dispatch<React.SetStateAction<LocalSettings>>
}) => {
  const settings = useReaderSettings()
  const { reader } = useReader()
  const readerState = useObserve(() => reader?.$.state$, [reader])
  const onlySupportScrollableMode =
    readerState?.supportedPageTurnMode.length === 1 &&
    readerState.supportedPageTurnMode[0] === `scrollable`

  return (
    <Fieldset.Root>
      <Stack>
        <Fieldset.Legend>Navigation</Fieldset.Legend>
        <Fieldset.HelperText>Change page turning animation</Fieldset.HelperText>
      </Stack>
      <Fieldset.Content>
        <Stack
          padding={2}
          borderWidth={1}
          borderRadius={10}
          flexDirection="row"
          justifyContent="space-around"
          alignItems="center"
        >
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
            <Stack>
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
            </Stack>
          </RadioGroup>
          <Box borderWidth={1} alignSelf="stretch" />
          <Stack>
            <Field>
              <Checkbox
                disabled={
                  settings?.computedPageTurnMode === "scrollable" ||
                  localSettings.enableSwipe
                }
                checked={localSettings.enablePan}
                onCheckedChange={() => {
                  setLocalSettings((state) => ({
                    ...state,
                    enablePan: !state.enablePan,
                  }))
                }}
              >
                Enable pan
              </Checkbox>
            </Field>
            <Field>
              <Checkbox
                disabled={settings?.computedPageTurnMode === "scrollable"}
                checked={localSettings.enableSwipe}
                onCheckedChange={() => {
                  setLocalSettings((state) => ({
                    ...state,
                    enableSwipe: !state.enableSwipe,
                  }))
                }}
              >
                Enable swipe
              </Checkbox>
            </Field>
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
        </Stack>
        {/*   <RadioGroup defaultValue={settings?.computedPageTurnDirection} onChange={value => {
             reader.settings.setSettings({
               pageTurnDirection: value as NonNullable<typeof settings>['computedPageTurnDirection']
             })
           }} value={settings?.computedPageTurnDirection}>
             <Stack >
               <Radio value="horizontal" isDisabled={!readerState?.supportedPageTurnDirection.includes(`horizontal`)}>horizontal</Radio>
               <Radio value="vertical" isDisabled={!readerState?.supportedPageTurnDirection.includes(`vertical`)}>vertical</Radio>
             </Stack>
           </RadioGroup>  */}
      </Fieldset.Content>
    </Fieldset.Root>
  )
}
