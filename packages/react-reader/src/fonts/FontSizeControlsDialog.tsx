import { Button, Fieldset, Stack } from "@chakra-ui/react"
import { memo } from "react"
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
import { Field } from "../components/ui/field"
import { Slider } from "../components/ui/slider"
import { useReaderContextValue } from "../context/useReaderContext"
// import {
//   SCOPE_DEVICE_MOBILE_QUERY,
//   SCOPE_DEVICE_TABLET_QUERY,
// } from "../settings/types"

export const FontSizeControlsDialog = memo(() => {
  const {
    fontSizeMenuOpen,
    onFontSizeMenuOpenChange,
    fontSize,
    fontSizeMin,
    fontSizeMax,
    fontSizeScopeValue,
    onFontSizeValueChange,
  } = useReaderContextValue([
    "fontSizeMenuOpen",
    "onFontSizeMenuOpenChange",
    "fontSize",
    "fontSizeMin",
    "fontSizeMax",
    "fontSizeScopeValue",
    "onFontSizeValueChange",
  ])
  // const [isMobile, isTablet] = useMediaQuery([
  //   SCOPE_DEVICE_MOBILE_QUERY,
  //   SCOPE_DEVICE_TABLET_QUERY,
  // ])

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
            {/* <Fieldset.Root>
              <Fieldset.Legend>Scope</Fieldset.Legend>
              <Fieldset.HelperText>
                The scope to which apply the font size for this book.
              </Fieldset.HelperText>
              <Fieldset.Content>
                <RadioGroup
                  defaultValue={`book` satisfies SETTING_SCOPE}
                  onValueChange={(e) => {
                    const value = e.value as SETTING_SCOPE

                    onFontSizeScopeValueChange(value)
                  }}
                  value={fontSizeScopeValue}
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
            </Fieldset.Root> */}
            <Fieldset.Root>
              <Fieldset.Legend>Font scale</Fieldset.Legend>
              <Fieldset.HelperText>
                Only the one related to the scope will be applied.
              </Fieldset.HelperText>
              <Fieldset.Content>
                <Field label="Book">
                  <Slider
                    label={`%`}
                    disabled={fontSizeScopeValue !== "book"}
                    value={[(fontSize ?? 1) * 100]}
                    onValueChange={(e) => {
                      const value = e.value[0] ?? 0

                      onFontSizeValueChange(value / 100)
                    }}
                    {...sliderCommonProps}
                  />
                </Field>
                {/* <Field label="Mobile devices">
                  <Slider
                    label="Font scale (%) - Scope book"
                    disabled={fontSizeScopeValue !== "device"}
                    onValueChange={(e) => {
                      const value = e.value[0] ?? 0

                      onFontSizeValueChange(value / 100)
                    }}
                    {...sliderCommonProps}
                  />
                </Field>
                <Field label="Tablet devices">
                  <Slider
                    label="Font scale (%) - Scope book"
                    disabled={fontSizeScopeValue !== "device"}
                    onValueChange={(e) => {
                      const value = e.value[0] ?? 0

                      onFontSizeValueChange(value / 100)
                    }}
                    {...sliderCommonProps}
                  />
                </Field>
                <Field label="Desktop devices">
                  <Slider
                    label="Font scale (%) - Scope book"
                    disabled={fontSizeScopeValue !== "device"}
                    onValueChange={(e) => {
                      const value = e.value[0] ?? 0

                      onFontSizeValueChange(value / 100)
                    }}
                    {...sliderCommonProps}
                  />
                </Field>
                <Field label="Global">
                  <Slider
                    label="Font scale (%) - Scope book"
                    disabled={fontSizeScopeValue !== "global"}
                    onValueChange={(e) => {
                      const value = e.value[0] ?? 0

                      onFontSizeValueChange(value / 100)
                    }}
                    {...sliderCommonProps}
                  />
                </Field> */}
              </Fieldset.Content>
            </Fieldset.Root>
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
