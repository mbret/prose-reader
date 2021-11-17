import React, { useState } from 'react'
import RcSlider from 'rc-slider';
import 'rc-slider/assets/index.css';
import { Reader } from "@prose-reader/core";
import { FormControl, FormHelperText, FormLabel, HStack, Radio, RadioGroup, Box } from '@chakra-ui/react';
import { NavigationSettings } from '../common/NavigationSettings';
import { Settings } from '../common/Settings';

export const ClassicSettings = ({ reader, open, onExit }: { reader: Reader, open: boolean, onExit: () => void }) => {
  const [fontWeight, setFontWeight] = useState<string>(reader.getFontWeight()?.toString() || `default`)
  const [lineHeight, setLineHeight] = useState<string>(reader.getLineHeight()?.toString() || `default`)
  const [theme, setTheme] = useState<string>(reader.getTheme() || `default`)
  const [value, setValue] = useState(parseFloat(localStorage.getItem(`fontScale`) || `1`) || 1)
  const max = 5
  const min = 0.1
  const step = 0.1

  if (!open) return null

  return (
    <Settings onExit={onExit} open>
      <FormControl as="fieldset">
        <FormLabel as="legend">Font scale (current: {value})</FormLabel>
        <RcSlider
          value={value}
          max={max}
          min={min}
          onChange={value => {
            reader.setFontScale(value)
            localStorage.setItem(`fontScale`, value.toString())
            setValue(value)
          }}
          step={step}
        />
      </FormControl>
      <FormControl as="fieldset" style={{ marginTop: 10 }}>
        <FormLabel as="legend">Line height</FormLabel>
        <RadioGroup defaultValue="default" onChange={value => {
          setLineHeight(value)
          if (value === `default`) {
            reader.setLineHeight(undefined)
          } else {
            reader.setLineHeight(parseInt(value))
          }
        }} value={lineHeight}>
          <HStack spacing="24px">
            <Radio value="1">small</Radio>
            <Radio value="default">default (publisher)</Radio>
            <Radio value="2">big</Radio>
          </HStack>
        </RadioGroup>
        <FormHelperText>Change the space between lines</FormHelperText>
      </FormControl>
      <FormControl as="fieldset" style={{ marginTop: 10 }}>
        <FormLabel as="legend">Font weight</FormLabel>
        <RadioGroup defaultValue="default" onChange={value => {
          setFontWeight(value)
          if (value === `default`) {
            reader.setFontWeight(undefined)
          } else {
            reader.setFontWeight(parseInt(value) as 100)
          }
        }} value={fontWeight}>
          <HStack spacing="24px">
            <Radio value="100">small</Radio>
            <Radio value="default">default (publisher)</Radio>
            <Radio value="900">big</Radio>
          </HStack>
        </RadioGroup>
        <FormHelperText>Change the weight of the text in the entire book</FormHelperText>
      </FormControl>
      <FormControl as="fieldset" style={{ marginTop: 10 }}>
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
}