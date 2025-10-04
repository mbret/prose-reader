import {
  Button,
  Fieldset,
  HStack,
  type SliderValueChangeDetails,
  Stack,
  Tabs,
  type TabsValueChangeDetails,
  useMediaQuery,
} from "@chakra-ui/react"
import { type ComponentProps, memo, useCallback, useState } from "react"
import { LuCheck } from "react-icons/lu"
import { useLiveRef } from "reactjrx"
import {
  DialogActionTrigger,
  DialogBody,
  DialogCloseTrigger,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogRoot,
  DialogTitle,
} from "../components/ui/dialog"
import { Radio, RadioGroup } from "../components/ui/radio"
import { Slider } from "../components/ui/slider"
import {
  useReaderContext,
  useReaderContextValue,
} from "../context/useReaderContext"
import {
  SCOPE_DEVICE_MOBILE_QUERY,
  SCOPE_DEVICE_TABLET_QUERY,
  type SETTING_SCOPE,
  type SETTING_SCOPE_REFERENCE,
  SETTINGS_SCOPES,
  SETTINGS_SCOPES_REFERENCES,
} from "../settings/types"

export const FontSizeControlsDialog = memo(() => {
  const context = useReaderContext()
  const {
    fontSizeMenuOpen,
    onFontSizeMenuOpenChange,
    uncontrolledFontSize,
    fontSize = uncontrolledFontSize,
    fontSizeMin,
    fontSizeMax,
    fontSizeScope,
    onFontSizeChange,
    onFontSizeScopeChange,
  } = useReaderContextValue([
    "fontSizeMenuOpen",
    "onFontSizeMenuOpenChange",
    "fontSize",
    "fontSizeMin",
    "fontSizeMax",
    "fontSizeScope",
    "onFontSizeChange",
    "onFontSizeScopeChange",
    "uncontrolledFontSize",
  ])
  const onFontSizeChangeRef = useLiveRef(onFontSizeChange)
  const [isMobile, isTablet] = useMediaQuery([
    SCOPE_DEVICE_MOBILE_QUERY,
    SCOPE_DEVICE_TABLET_QUERY,
  ])
  const [tabValue, setTabValue] = useState<SETTING_SCOPE_REFERENCE>(
    fontSizeScope ?? "global",
  )
  const onFontUpdate = useCallback(
    (scope: SETTING_SCOPE_REFERENCE, value: number) => {
      if (onFontSizeChangeRef.current) {
        onFontSizeChangeRef.current(scope, value)
      } else {
        context.update((old) => ({
          ...old,
          fontSize: value,
        }))
      }
    },
    [onFontSizeChangeRef, context],
  )
  const getValueForScope = useCallback(
    (scope: SETTING_SCOPE_REFERENCE) => {
      if (scope === "global") {
        return fontSize
      }

      return fontSize
    },
    [fontSize],
  )

  const sliderCommonProps = {
    showValue: true,
    max: fontSizeMax * 100,
    min: fontSizeMin * 100,
    width: "100%",
    step: 0.1 * 100,
    marks: [
      { value: 100, label: "Publisher" },
      { value: fontSizeMin * 100, label: `${fontSizeMin * 100}%` },
      { value: fontSizeMax * 100, label: `${fontSizeMax * 100}%` },
    ],
  }

  const onScopeValueChange = useCallback(
    (
      details: Parameters<
        NonNullable<ComponentProps<typeof RadioGroup>["onValueChange"]>
      >[0],
    ) => {
      const value = details.value as SETTING_SCOPE

      onFontSizeScopeChange?.(value)
    },
    [onFontSizeScopeChange],
  )

  const onTabValueChange = useCallback((details: TabsValueChangeDetails) => {
    setTabValue(details.value as SETTING_SCOPE_REFERENCE)
  }, [])

  const onSliderValueChange = useCallback(
    (details: SliderValueChangeDetails) => {
      const value = details.value[0] ?? 0

      onFontUpdate(tabValue, value / 100)
    },
    [onFontUpdate, tabValue],
  )

  return (
    <DialogRoot
      lazyMount
      open={fontSizeMenuOpen}
      onOpenChange={(e) => {
        onFontSizeMenuOpenChange(e.open)
      }}
      placement="center"
    >
      <DialogContent maxH="40vh" overflow="auto">
        <DialogHeader>
          <DialogTitle>Font size</DialogTitle>
        </DialogHeader>
        <DialogBody>
          <Stack gap={8} flex={1}>
            <Fieldset.Root>
              <Fieldset.Legend>Scope</Fieldset.Legend>
              <Fieldset.HelperText>
                The scope to which apply the font size for this book.
              </Fieldset.HelperText>
              <Fieldset.Content>
                <RadioGroup
                  onValueChange={onScopeValueChange}
                  value={fontSizeScope ?? "global"}
                  disabled={!fontSizeScope}
                >
                  <HStack gap={2}>
                    {SETTINGS_SCOPES.map((scope) => (
                      <Radio value={scope} key={scope}>
                        {scope === "device"
                          ? isMobile
                            ? `device (Mobile)`
                            : isTablet
                              ? "device (Tablet)"
                              : "device (Desktop)"
                          : scope}
                      </Radio>
                    ))}
                  </HStack>
                </RadioGroup>
              </Fieldset.Content>
            </Fieldset.Root>
            <Tabs.Root value={tabValue} onValueChange={onTabValueChange}>
              <Tabs.List>
                {SETTINGS_SCOPES_REFERENCES.map((scope) => (
                  <Tabs.Trigger
                    value={scope}
                    key={scope}
                    textTransform="capitalize"
                    disabled={scope !== "global" && !fontSizeScope}
                  >
                    {fontSizeScope === scope && <LuCheck />}
                    {scope}
                  </Tabs.Trigger>
                ))}
              </Tabs.List>
              {SETTINGS_SCOPES_REFERENCES.map((scope) => (
                <Tabs.Content value={scope} key={scope}>
                  <Slider
                    label={`%`}
                    value={[(getValueForScope(scope) ?? 1) * 100]}
                    onValueChange={onSliderValueChange}
                    {...sliderCommonProps}
                  />
                </Tabs.Content>
              ))}
            </Tabs.Root>
          </Stack>
        </DialogBody>
        <DialogFooter>
          <DialogActionTrigger asChild>
            <Button variant="outline">Close</Button>
          </DialogActionTrigger>
        </DialogFooter>
        <DialogCloseTrigger />
      </DialogContent>
    </DialogRoot>
  )
})
