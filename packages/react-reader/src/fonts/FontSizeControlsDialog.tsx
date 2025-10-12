import {
  Button,
  Fieldset,
  HStack,
  type SliderValueChangeDetails,
  Stack,
  Tabs,
  type TabsValueChangeDetails,
} from "@chakra-ui/react"
import {
  type ComponentProps,
  memo,
  useCallback,
  useEffect,
  useState,
} from "react"
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
  type PROSE_REACT_READER_SETTINGS_SCOPE,
  PROSE_REACT_READER_SETTINGS_SCOPE_CONFIGURATION,
  type PROSE_REACT_READER_SETTINGS_SCOPE_REFERENCE,
} from "../settings/types"

const SETTINGS_SCOPES_VALUES =
  PROSE_REACT_READER_SETTINGS_SCOPE_CONFIGURATION.map((item) => item.value)
const SETTINGS_SCOPES_REFERENCES =
  PROSE_REACT_READER_SETTINGS_SCOPE_CONFIGURATION.flatMap(
    (item) => item.references,
  )

const getScopeForReference = (
  reference: PROSE_REACT_READER_SETTINGS_SCOPE_REFERENCE | undefined,
) => {
  if (!reference) {
    return undefined
  }

  return PROSE_REACT_READER_SETTINGS_SCOPE_CONFIGURATION.find((item) =>
    (item.references as readonly string[]).includes(reference),
  )?.value
}

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
    fontSizeValues,
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
    "fontSizeValues",
  ])
  const onFontSizeChangeRef = useLiveRef(onFontSizeChange)
  const [tabValue, setTabValue] =
    useState<PROSE_REACT_READER_SETTINGS_SCOPE_REFERENCE>(
      fontSizeScope ?? "global",
    )
  const onFontUpdate = useCallback(
    (scope: PROSE_REACT_READER_SETTINGS_SCOPE_REFERENCE, value: number) => {
      if (onFontSizeChangeRef.current) {
        onFontSizeChangeRef.current(scope, value)
      } else {
        context.update((old) => ({
          ...old,
          uncontrolledFontSize: value,
        }))
      }
    },
    [onFontSizeChangeRef, context],
  )
  const getValueForScope = useCallback(
    (scope: PROSE_REACT_READER_SETTINGS_SCOPE_REFERENCE) => {
      return fontSizeValues?.[scope] ?? fontSize
    },
    [fontSize, fontSizeValues],
  )

  const onScopeValueChange = useCallback(
    (
      details: Parameters<
        NonNullable<ComponentProps<typeof RadioGroup>["onValueChange"]>
      >[0],
    ) => {
      const value = details.value as PROSE_REACT_READER_SETTINGS_SCOPE

      onFontSizeScopeChange?.(value)
    },
    [onFontSizeScopeChange],
  )

  const onTabValueChange = useCallback((details: TabsValueChangeDetails) => {
    setTabValue(details.value as PROSE_REACT_READER_SETTINGS_SCOPE_REFERENCE)
  }, [])

  const onSliderValueChange = useCallback(
    (details: SliderValueChangeDetails) => {
      const value = details.value[0] ?? 0

      onFontUpdate(tabValue, value / 100)
    },
    [onFontUpdate, tabValue],
  )

  useEffect(
    function syncScopeChangeWithTabs() {
      setTabValue(fontSizeScope ?? "global")
    },
    [fontSizeScope],
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
          <Stack gap={4} flex={1}>
            <Fieldset.Root>
              <Fieldset.Legend>Scope</Fieldset.Legend>
              <Fieldset.HelperText>
                The scope to which apply the font size for this book.
              </Fieldset.HelperText>
              <Fieldset.Content>
                <RadioGroup
                  onValueChange={onScopeValueChange}
                  value={getScopeForReference(fontSizeScope) ?? "global"}
                  disabled={!onFontSizeScopeChange}
                >
                  <HStack gap={2}>
                    {SETTINGS_SCOPES_VALUES.map((scope) => (
                      <Radio value={scope} key={scope}>
                        {scope}
                      </Radio>
                    ))}
                  </HStack>
                </RadioGroup>
              </Fieldset.Content>
            </Fieldset.Root>
            <Tabs.Root
              value={tabValue}
              onValueChange={onTabValueChange}
              fitted={false}
              size="sm"
            >
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
                    showValue={true}
                    marks={[
                      { value: 100, label: "Publisher" },
                      {
                        value: fontSizeMin * 100,
                        label: `${fontSizeMin * 100}%`,
                      },
                      {
                        value: fontSizeMax * 100,
                        label: `${fontSizeMax * 100}%`,
                      },
                    ]}
                    max={fontSizeMax * 100}
                    min={fontSizeMin * 100}
                    width="100%"
                    step={0.1 * 100}
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
