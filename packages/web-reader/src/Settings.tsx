import React, { useState } from 'react'
import RcSlider from 'rc-slider';
import 'rc-slider/assets/index.css';
import { atom, useRecoilCallback } from 'recoil';
import { Reader } from "@oboku/reader";
import { FormControl, FormHelperText, FormLabel, HStack, Radio, RadioGroup } from '@chakra-ui/react';

export const settingsState = atom({
  key: `SettingsState`,
  default: false
})

export const useToggleSettings = () => useRecoilCallback(({ set }) => () => {
  set(settingsState, val => !val)
})

export const Settings = ({ reader }: { reader: Reader }) => {
  const toggleSettings = useToggleSettings()
  const [fontWeight, setFontWeight] = useState<string>(reader.getFontWeight()?.toString() || `default`)
  const [value, setValue] = useState(parseFloat(localStorage.getItem(`fontScale`) || `1`) || 1)
  const max = 5
  const min = 0.1
  const step = 0.1

  return (
    <div style={{
      height: `100%`,
      width: `100%`,
      position: 'absolute',
      backgroundColor: `rgb(0 0 0 / 50%)`,
      left: 0,
      top: 0,
      overflow: 'hidden'
    }} >
      <div style={{
        position: 'absolute',
        height: `100%`,
        width: `100%`,
        left: 0,
        top: 0,
      }} onClick={toggleSettings} />
      <div style={{
        height: `35%`,
        width: `100%`,
        position: 'absolute',
        bottom: 0,
        backgroundColor: 'white',
        overflow: 'scroll',
        padding: 10
      }}>
        Font scale
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
        <div style={{
          marginTop: `30px`,

        }}>
          Line height
          <div>
            <button
              onClick={() => {
                reader.setLineHeight(1)
              }}
            >small</button>
            <button
              onClick={() => {
                reader.setLineHeight(`default`)
              }}
            >normal</button>
            <button
              onClick={() => {
                reader.setLineHeight(2)
              }}
            >big</button>
          </div>
        </div>
        <FormControl as="fieldset">
          <FormLabel as="legend">Font weight</FormLabel>
          <RadioGroup defaultValue="default" onChange={value =>{
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
      </div>
    </div>
  )
}