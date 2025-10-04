import {
  Button,
  Fieldset,
  HStack,
  Stack,
  Tabs,
  useMediaQuery,
} from "@chakra-ui/react"
import { memo, useCallback, useState } from "react"
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
  const activeReferenceScope: SETTING_SCOPE_REFERENCE =
    fontSizeScope === "book"
      ? "book"
      : fontSizeScope === "device"
        ? isMobile
          ? "mobile"
          : isTablet
            ? "tablet"
            : "desktop"
        : "global"
  const [tabValue, setTabValue] = useState<string | null>(activeReferenceScope)

  const onFontUpdate = useCallback(
    (scope: SETTING_SCOPE_REFERENCE, value: number) => {
      if (scope === activeReferenceScope) {
        if (onFontSizeChangeRef.current) {
          onFontSizeChangeRef.current(value)
        } else {
          context.update((old) => ({
            ...old,
            fontSize: value,
          }))
        }
      }
    },
    [activeReferenceScope, onFontSizeChangeRef, context],
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

  console.log({ activeReferenceScope, fontSizeScope, fontSize })

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
                  onValueChange={(e) => {
                    const value = e.value as SETTING_SCOPE

                    onFontSizeScopeChange?.(value)
                  }}
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
            <Tabs.Root
              value={tabValue}
              onValueChange={(e) => setTabValue(e.value)}
            >
              <Tabs.List>
                {SETTINGS_SCOPES_REFERENCES.map((scope) => (
                  <Tabs.Trigger
                    value={scope}
                    key={scope}
                    textTransform="capitalize"
                    disabled={scope !== "global" && !fontSizeScope}
                  >
                    {activeReferenceScope === scope && <LuCheck />}
                    {scope}
                  </Tabs.Trigger>
                ))}
              </Tabs.List>
              {SETTINGS_SCOPES_REFERENCES.map((scope) => (
                <Tabs.Content value={scope} key={scope}>
                  <Slider
                    label={`%`}
                    value={[(getValueForScope(scope) ?? 1) * 100]}
                    onValueChange={(e) => {
                      const value = e.value[0] ?? 0

                      onFontUpdate(scope, value / 100)
                    }}
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
