import React, { memo, useEffect, useState } from "react"
import RcSlider from "rc-slider"
import "rc-slider/assets/index.css"
import { Reader } from "@prose-reader/core"
import { FormControl, FormHelperText, FormLabel, HStack, Radio, RadioGroup, Text, Box } from "@chakra-ui/react"
import { NavigationSettings } from "../common/NavigationSettings"
import { Settings } from "../common/Settings"
import { ArrowDownIcon, ArrowUpIcon, ArrowBackIcon, ArrowForwardIcon } from "@chakra-ui/icons"
import { OtherSettings } from "../common/OtherSettings"
import { useReaderSettings } from "../common/useReaderSettings"

type Theme = Parameters<Reader[`theme`][`set`]>[0]

export const ClassicSettings = memo(({ reader, open, onExit }: { reader: Reader; open: boolean; onExit: () => void }) => {
  const [theme, setTheme] = useState<Theme>(reader.theme.get() || `publisher`)
  const readerSettings = useReaderSettings()
  const [fontScaleSliderValue, setFontScaleSliderValue] = useState(1)
  const [verticalMarginSliderValue, setVerticalMarginSliderValue] = useState(0)
  const [horizontalMarginSliderValue, setHorizontalMarginSliderValue] = useState(0)

  // async update from reader to slider
  useEffect(() => {
    if (readerSettings?.fontScale !== undefined) {
      setFontScaleSliderValue((old) => (old !== readerSettings.fontScale ? readerSettings.fontScale : old))
    }
  }, [readerSettings?.fontScale])

  useEffect(() => {
    if (readerSettings?.pageVerticalMargin !== undefined) {
      setVerticalMarginSliderValue((old) => (old !== readerSettings.pageVerticalMargin ? readerSettings.pageVerticalMargin : old))
    }
  }, [readerSettings?.pageVerticalMargin])

  useEffect(() => {
    if (readerSettings?.pageHorizontalMargin !== undefined) {
      setHorizontalMarginSliderValue((old) =>
        old !== readerSettings.pageHorizontalMargin ? readerSettings.pageHorizontalMargin : old
      )
    }
  }, [readerSettings?.pageHorizontalMargin])

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
            max={5}
            min={0.2}
            step={0.2}
            onChange={(value) => {
              if (typeof value === "number") {
                reader.setSettings({
                  fontScale: value
                })
                setFontScaleSliderValue(value)
              }
            }}
          />
          <Text flex={0.3} textAlign="center" whiteSpace="nowrap">
            {((readerSettings?.fontScale || 1) * 100).toFixed(0)} %
          </Text>
        </Box>
      </FormControl>
      <FormControl as="fieldset" mt={4}>
        <FormLabel as="legend">Line height</FormLabel>
        <RadioGroup
          defaultValue="publisher"
          onChange={(value) => {
            reader.setSettings({
              lineHeight: value === `publisher` ? `publisher` : parseInt(value)
            })
          }}
          value={readerSettings?.lineHeight.toString()}
        >
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
        <RadioGroup
          defaultValue="publisher"
          onChange={(value) => {
            reader.setSettings({
              fontWeight: value === `publisher` ? `publisher` : (parseInt(value) as 100)
            })
          }}
          value={readerSettings?.fontWeight.toString()}
        >
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
        <RadioGroup
          defaultValue="default"
          onChange={(value: Theme) => {
            setTheme(value)
            reader.theme.set(value)
          }}
          value={theme}
        >
          <HStack spacing="12px">
            <Radio value="publisher">default (publisher)</Radio>
            <Radio value="sepia">sepia</Radio>
            <Radio value="bright">bright</Radio>
            <Radio value="night">night</Radio>
          </HStack>
        </RadioGroup>
      </FormControl>
      <FormControl as="fieldset" mt={4}>
        <FormLabel as="legend">Margins</FormLabel>
        <Box display="flex" alignItems="center">
          <Box display="flex" flexDirection="column" flex={0.2} alignItems="center">
            <ArrowDownIcon />
            <ArrowUpIcon />
          </Box>
          <RcSlider
            style={{
              width: `auto`,
              flex: 1
            }}
            value={verticalMarginSliderValue}
            max={60}
            min={0}
            step={4}
            onChange={(value) => {
              if (typeof value === "number") {
                reader.setSettings({
                  pageVerticalMargin: value
                })
                setVerticalMarginSliderValue(value)
              }
            }}
          />
          <Text flex={0.4} textAlign="center" whiteSpace="nowrap">
            {readerSettings?.pageVerticalMargin}px
          </Text>
        </Box>
        <Box display="flex" alignItems="center">
          <Box display="flex" flexDirection="row" flex={0.2} justifyContent="center">
            <ArrowForwardIcon />
            <ArrowBackIcon />
          </Box>
          <RcSlider
            style={{
              width: `auto`,
              flex: 1
            }}
            value={horizontalMarginSliderValue}
            max={60}
            min={0}
            step={4}
            onChange={(value) => {
              if (typeof value === "number") {
                reader.setSettings({
                  pageHorizontalMargin: value
                })
                setHorizontalMarginSliderValue(value)
              }
            }}
          />
          <Text flex={0.4} textAlign="center" whiteSpace="nowrap">
            {readerSettings?.pageHorizontalMargin}px
          </Text>
        </Box>
      </FormControl>
      <NavigationSettings reader={reader} />
      <OtherSettings />
    </Settings>
  )
})
