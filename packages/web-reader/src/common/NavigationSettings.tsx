import React from 'react'
import { Reader } from "@prose-reader/core";
import { FormControl, FormHelperText, FormLabel, Stack, Radio, RadioGroup, Box, Checkbox, CheckboxGroup } from '@chakra-ui/react';
import { useRecoilValue } from 'recoil';
import { readerSettingsState, readerStateState } from '../state';

export const NavigationSettings = ({ reader }: { reader: Reader }) => {
  const settings = useRecoilValue(readerSettingsState)
  const readerState = useRecoilValue(readerStateState)

  const pageTurnAnimation = settings?.computedPageTurnMode === `scrollable`
    ? `scrollable`
    : settings?.computedPageTurnAnimation
  const onlySupportScrollableMode = readerState?.supportedPageTurnMode.length === 1 && readerState.supportedPageTurnMode[0] === `scrollable`

  return (
    <FormControl as="fieldset" style={{ marginTop: 10 }}>
      <FormLabel as="legend">Navigation</FormLabel>
      <FormHelperText mt={0} mb={2}>Change page turning animation</FormHelperText>
      <Box padding={2} borderWidth={1} borderRadius={10} display="flex" flexDirection="row" justifyContent="space-around" alignItems="center">
        <RadioGroup defaultValue={settings?.computedPageTurnAnimation} onChange={value => {
          reader.setSettings({
            pageTurnAnimation: value as NonNullable<typeof settings>['computedPageTurnAnimation'],
            pageTurnMode: `controlled`
          })
        }} value={settings?.computedPageTurnAnimation}>
          <Stack >
            <Radio value="none" isDisabled={onlySupportScrollableMode || !readerState?.supportedPageTurnAnimation.includes(`none`)}>none</Radio>
            <Radio value="fade" isDisabled={onlySupportScrollableMode || !readerState?.supportedPageTurnAnimation.includes(`fade`)}>fade</Radio>
            <Radio value="slide" isDisabled={onlySupportScrollableMode || !readerState?.supportedPageTurnAnimation.includes(`slide`)}>slide</Radio>
          </Stack>
        </RadioGroup>
        <Box borderWidth={1} alignSelf="stretch" />
        <Stack>
          <Checkbox
            isDisabled={
              !readerState?.supportedPageTurnMode.includes(`scrollable`)
              || (readerState?.supportedPageTurnMode.includes(`scrollable`) && readerState?.supportedPageTurnMode.length === 1)
            }
            isChecked={settings?.computedPageTurnMode === `scrollable`}
            defaultIsChecked={settings?.computedPageTurnMode === `scrollable`}
            onChange={e => {
              reader.setSettings({
                pageTurnMode: e.target.checked ? `scrollable` : `controlled`
              })
            }}
          >
            Enable scroll
          </Checkbox>
          <Checkbox
            isDisabled={
              !readerState?.supportedPageTurnDirection.includes(`vertical`)
              || (readerState?.supportedPageTurnDirection.includes(`vertical`) && readerState?.supportedPageTurnDirection.length === 1)
            }
            isChecked={settings?.computedPageTurnDirection === `vertical`}
            defaultIsChecked={settings?.computedPageTurnDirection === `vertical`}
            onChange={e => {
              reader.setSettings({
                pageTurnDirection: e.target.checked ? `vertical` : `horizontal`
              })
            }}
          >
            Vertical mode
          </Checkbox>
        </Stack>
        {/* <RadioGroup defaultValue={settings?.computedPageTurnDirection} onChange={value => {
          reader.setSettings({
            pageTurnDirection: value as NonNullable<typeof settings>['computedPageTurnDirection']
          })
        }} value={settings?.computedPageTurnDirection}>
          <Stack >
            <Radio value="horizontal" isDisabled={!readerState?.supportedPageTurnDirection.includes(`horizontal`)}>horizontal</Radio>
            <Radio value="vertical" isDisabled={!readerState?.supportedPageTurnDirection.includes(`vertical`)}>vertical</Radio>
          </Stack>
        </RadioGroup> */}
      </Box>
    </FormControl>
  )
}