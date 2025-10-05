import type React from "react"
import { useEffect, useState } from "react"
import screenfull from "screenfull"
import "rc-slider/assets/index.css"
import { Heading, HStack, Stack } from "@chakra-ui/react"
import type { Theme } from "@prose-reader/core"
import {
  IoMdArrowDown,
  IoMdArrowRoundBack,
  IoMdArrowRoundForward,
  IoMdArrowUp,
} from "react-icons/io"
import { NavigationSettings } from "../../common/NavigationSettings"
import { OtherSettings } from "../../common/OtherSettings"
import { Checkbox } from "../../components/ui/checkbox"
import { Field } from "../../components/ui/field"
import { Radio, RadioGroup } from "../../components/ui/radio"
import { Slider } from "../../components/ui/slider"
import { useReader } from "../useReader"
import { useReaderSettings } from "./useReaderSettings"
import type { LocalSettings } from "./useSettings"

const SectionHeading = ({ children }: { children: React.ReactNode }) => {
  return (
    <Heading size="lg" mt={2}>
      {children}
    </Heading>
  )
}

export const SettingsMenu = ({
  open,
  localSettings,
  setLocalSettings,
}: {
  open: boolean
  setLocalSettings: React.Dispatch<React.SetStateAction<LocalSettings>>
  localSettings: LocalSettings
}) => {
  const [isFullscreen, setIsFullScreen] = useState(screenfull.isFullscreen)
  const { reader } = useReader()
  const [theme, setTheme] = useState<Theme>(reader?.theme.get() || `publisher`)
  const readerSettings = useReaderSettings()
  const [verticalMarginSliderValue, setVerticalMarginSliderValue] = useState(0)
  const [horizontalMarginSliderValue, setHorizontalMarginSliderValue] =
    useState(0)

  useEffect(() => {
    if (readerSettings?.pageVerticalMargin !== undefined) {
      setVerticalMarginSliderValue((old) =>
        old !== readerSettings.pageVerticalMargin
          ? readerSettings.pageVerticalMargin
          : old,
      )
    }
  }, [readerSettings?.pageVerticalMargin])

  useEffect(() => {
    if (readerSettings?.pageHorizontalMargin !== undefined) {
      setHorizontalMarginSliderValue((old) =>
        old !== readerSettings.pageHorizontalMargin
          ? readerSettings.pageHorizontalMargin
          : old,
      )
    }
  }, [readerSettings?.pageHorizontalMargin])

  useEffect(() => {
    if (screenfull.isEnabled) {
      const cb = () => {
        setIsFullScreen(screenfull.isFullscreen)
      }

      screenfull.on("change", cb)

      return () => {
        screenfull.off(`change`, cb)
      }
    }
  }, [])

  if (!open || !reader) return null

  return (
    <Stack
      padding={4}
      style={{
        overflow: "auto",
      }}
      gap={4}
    >
      <Field>
        <Checkbox
          checked={isFullscreen}
          defaultChecked={false}
          onCheckedChange={async (e) => {
            if (screenfull.isEnabled) {
              if (e.checked) {
                await screenfull.request()
              } else {
                await screenfull.exit()
              }
            }
          }}
        >
          Use full screen
        </Checkbox>
      </Field>
      <Field label="Line height" helperText="Change the space between lines">
        <RadioGroup
          defaultValue="publisher"
          onValueChange={(e) => {
            reader.settings.update({
              lineHeight:
                e.value === `publisher`
                  ? `publisher`
                  : Number.parseInt(e.value ?? `1`, 10),
            })
          }}
          value={readerSettings?.lineHeight.toString()}
        >
          <HStack gap="24px">
            <Radio value="1">small</Radio>
            <Radio value="publisher">default (publisher)</Radio>
            <Radio value="2">big</Radio>
          </HStack>
        </RadioGroup>
      </Field>
      <Field
        label="Font weight"
        helperText="Change the weight of the text in the entire book (if supported by current font)"
      >
        <RadioGroup
          defaultValue="publisher"
          onValueChange={(e) => {
            reader.settings.update({
              fontWeight:
                e.value === `publisher`
                  ? `publisher`
                  : (Number.parseInt(e.value ?? "100", 10) as 100),
            })
          }}
          value={readerSettings?.fontWeight.toString()}
        >
          <HStack gap="24px">
            <Radio value="100">small</Radio>
            <Radio value="publisher">default (publisher)</Radio>
            <Radio value="900">big</Radio>
          </HStack>
        </RadioGroup>
      </Field>
      <Field
        label="Theme"
        helperText="Change the weight of the text in the entire book (if supported by current font)"
      >
        <RadioGroup
          defaultValue="default"
          onValueChange={(e) => {
            const value = (e.value ?? "publisher") as Theme
            setTheme(value)
            reader.theme.set(value)
          }}
          value={theme}
        >
          <HStack gap="24px">
            <Radio value="publisher">default (publisher)</Radio>
            <Radio value="sepia">sepia</Radio>
            <Radio value="bright">bright</Radio>
            <Radio value="night">night</Radio>
          </HStack>
        </RadioGroup>
      </Field>
      <Field label="Margins">
        <Stack
          direction="row"
          gap={4}
          alignItems="center"
          width="100%"
          maxWidth="300px"
        >
          <Stack gap={0}>
            <IoMdArrowDown />
            <IoMdArrowUp />
          </Stack>
          <Slider
            flex={1}
            value={[verticalMarginSliderValue]}
            max={60}
            min={0}
            step={4}
            marks={[
              { value: 0, label: `0px` },
              { value: 30, label: `30px` },
              {
                value: 60,
                label: `60px`,
              },
            ]}
            onValueChange={(e) => {
              const value = e.value[0] ?? 0

              setVerticalMarginSliderValue(value)
            }}
            onValueChangeEnd={() => {
              reader.settings.update({
                pageVerticalMargin: verticalMarginSliderValue,
              })
            }}
          />
        </Stack>
        <Stack
          direction="row"
          gap={4}
          alignItems="center"
          width="100%"
          maxWidth="300px"
        >
          <Stack gap={0}>
            <IoMdArrowRoundForward />
            <IoMdArrowRoundBack />
          </Stack>
          <Slider
            style={{
              width: `auto`,
              flex: 1,
            }}
            value={[horizontalMarginSliderValue]}
            max={60}
            min={0}
            step={4}
            marks={[
              { value: 0, label: `0px` },
              { value: 30, label: `30px` },
              {
                value: 60,
                label: `60px`,
              },
            ]}
            onValueChange={(e) => {
              const value = e.value[0] ?? 0

              setHorizontalMarginSliderValue(value)
            }}
            onValueChangeEnd={() => {
              reader.settings.update({
                pageHorizontalMargin: horizontalMarginSliderValue,
              })
            }}
          />
        </Stack>
      </Field>
      <SectionHeading>Navigation</SectionHeading>
      <NavigationSettings
        localSettings={localSettings}
        setLocalSettings={setLocalSettings}
      />
      <SectionHeading>More</SectionHeading>
      <OtherSettings />
    </Stack>
  )
}
