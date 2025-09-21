import { Button, Fieldset, Stack } from "@chakra-ui/react"
import type { RefitEnhancerOptions } from "@prose-reader/enhancer-refit"
import { memo } from "react"
import { useObserve } from "reactjrx"
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
import { Radio, RadioGroup } from "../components/ui/radio"
import { Slider } from "../components/ui/slider"
import { hasRefitEnhancer, useReader } from "../context/useReader"
import { useReaderContextValue } from "../context/useReaderContext"

type OptionValue = RefitEnhancerOptions["viewportFit"]

export const RefitDialog = memo(() => {
  const defaultCustomWidth = 60
  const { refitMenuOpen, onRefitMenuOpenChange } = useReaderContextValue([
    "refitMenuOpen",
    "onRefitMenuOpenChange",
  ])
  const reader = useReader()
  const readerWithRefit = hasRefitEnhancer(reader) ? reader : undefined
  const refitSettings = useObserve(
    () => readerWithRefit?.refit.settings$,
    [readerWithRefit],
  )

  return (
    <DialogRoot
      lazyMount
      open={refitMenuOpen}
      onOpenChange={(e) => onRefitMenuOpenChange(e.open)}
      placement="center"
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Viewport fit</DialogTitle>
        </DialogHeader>
        <DialogBody>
          <Fieldset.Root>
            <Fieldset.HelperText>
              Adjust the viewport for a more comfortable reading experience.
            </Fieldset.HelperText>
            <Fieldset.Content>
              <Field label="Profile">
                <RadioGroup
                  defaultValue={`fit` satisfies OptionValue}
                  onValueChange={(e) => {
                    const value = e.value as OptionValue
                    readerWithRefit?.refit.update({
                      viewportFit: value,
                      customWidth: defaultCustomWidth,
                    })
                  }}
                  value={refitSettings?.viewportFit ?? `fit`}
                >
                  <Stack gap={2}>
                    <Radio value={`desktop` satisfies OptionValue}>
                      Desktop
                    </Radio>
                    <Radio value={`tablet` satisfies OptionValue}>Tablet</Radio>
                    <Radio value={`fit` satisfies OptionValue}>
                      Full width (default)
                    </Radio>
                    <Radio value={`custom` satisfies OptionValue}>Custom</Radio>
                  </Stack>
                </RadioGroup>
              </Field>
              <Slider
                label="Maximum width (%)"
                showValue
                max={100}
                min={10}
                step={1}
                disabled={refitSettings?.viewportFit !== `custom`}
                value={[refitSettings?.customWidth ?? defaultCustomWidth]}
                onValueChange={(e) => {
                  const value = e.value[0] ?? 0

                  readerWithRefit?.refit.update({
                    customWidth: value,
                  })
                }}
              />
            </Fieldset.Content>
          </Fieldset.Root>
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
