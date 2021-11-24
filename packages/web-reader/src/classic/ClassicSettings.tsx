import React, { memo, useEffect, useState } from 'react'
import RcSlider from 'rc-slider';
import 'rc-slider/assets/index.css';
import { Reader } from "@prose-reader/core";
import { FormControl, FormHelperText, FormLabel, HStack, Radio, RadioGroup, Text, Box } from '@chakra-ui/react';
import { NavigationSettings } from '../common/NavigationSettings';
import { Settings } from '../common/Settings';
import { useRecoilValue } from 'recoil';
import { readerSettingsState } from '../state';

export const ClassicSettings = memo(({ reader, open, onExit }: { reader: Reader, open: boolean, onExit: () => void }) => {
  const [theme, setTheme] = useState<string>(reader.getTheme() || `default`)
  const readerSettings = useRecoilValue(readerSettingsState)
  const [fontScaleSliderValue, setFontScaleSliderValue] = useState(1)
  const max = 5
  const min = 0.2
  const step = 0.2

  // async update from reader to slider
  useEffect(() => {
    if (readerSettings?.fontScale) {
      setFontScaleSliderValue(old => old !== readerSettings.fontScale ? readerSettings.fontScale : old)
    }
  }, [readerSettings?.fontScale])

  if (!open) return null

  return (
    <Settings onExit={onExit} open>
      <FormControl as="fieldset">
        <FormLabel as="legend">Font size (%)</FormLabel>
        <Box display="flex" alignItems="center">
          <RcSlider
            style={{
              width: `auto`,
              flex: 1
            }}
            value={fontScaleSliderValue}
            max={max}
            min={min}
            onChange={value => {
              console.warn(`FOOO slider change`, readerSettings?.fontScale)
              reader.setSettings({
                fontScale: value
              })
              setFontScaleSliderValue(value)
            }}
            step={step}
          />
          <Text flex={0.3} textAlign="center" whiteSpace="nowrap">{((readerSettings?.fontScale || 1) * 100).toFixed(0)} %</Text>
        </Box>
      </FormControl>
      <FormControl as="fieldset" mt={4}>
        <FormLabel as="legend">Line height</FormLabel>
        <RadioGroup defaultValue="publisher" onChange={value => {
          reader.setSettings({
            lineHeight: value === `publisher` ? `publisher` : parseInt(value)
          })
        }} value={readerSettings?.lineHeight.toString()}>
          <HStack spacing="24px">
            <Radio value="1">small</Radio>
            <Radio value="publisher">default (publisher)</Radio>
            <Radio value="2">big</Radio>
          </HStack>
        </RadioGroup>
        <FormHelperText>Change the space between lines</FormHelperText>
      </FormControl>
      <FormControl as="fieldset" mt={4}>
        <FormLabel as="legend">Font weight</FormLabel>
        <RadioGroup defaultValue="publisher" onChange={value => {
          reader.setSettings({
            fontWeight: value === `publisher` ? `publisher` : parseInt(value) as 100
          })
        }} value={readerSettings?.fontWeight.toString()}>
          <HStack spacing="24px">
            <Radio value="100">small</Radio>
            <Radio value="publisher">default (publisher)</Radio>
            <Radio value="900">big</Radio>
          </HStack>
        </RadioGroup>
        <FormHelperText>Change the weight of the text in the entire book (if supported by current font)</FormHelperText>
      </FormControl>
      <FormControl as="fieldset" mt={4}>
        <FormLabel as="legend">Theme</FormLabel>
        <RadioGroup defaultValue="default" onChange={value => {
          setTheme(value)
          if (value === `default`) {
            reader.setTheme(undefined)
          } else {
            reader.setTheme(value as 'night')
          }
        }} value={theme}>
          <HStack spacing="12px">
            <Radio value="default">default (publisher)</Radio>
            <Radio value="sepia">sepia</Radio>
            <Radio value="bright">bright</Radio>
            <Radio value="night">night</Radio>
          </HStack>
        </RadioGroup>
      </FormControl>
      <NavigationSettings reader={reader} />
    </Settings>
  )
})