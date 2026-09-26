import { Button, Stack } from "@chakra-ui/react"
import { memo, useCallback } from "react"
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
import { Slider } from "../components/ui/slider"
import {
  useReaderContext,
  useReaderContextValue,
} from "../context/useReaderContext"
import { SettingScopes } from "../settings/SettingScopes"
import type { PROSE_REACT_READER_SETTINGS_SCOPE_REFERENCE } from "../settings/types"

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
            <SettingScopes
              scopeHelperText="The scope to which apply the font size for this book."
              activeScope={fontSizeScope}
              onActiveScopeChange={onFontSizeScopeChange}
              renderScopeValue={(scope) => (
                <Slider
                  label={`%`}
                  value={[(fontSizeValues?.[scope] ?? fontSize ?? 1) * 100]}
                  onValueChange={(details) => {
                    onFontUpdate(scope, (details.value[0] ?? 0) / 100)
                  }}
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
              )}
            />
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
