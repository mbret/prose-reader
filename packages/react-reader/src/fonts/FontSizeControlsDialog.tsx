import { Button, Stack } from "@chakra-ui/react"
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
import { Slider } from "../components/ui/slider"
import { useReaderContextValue } from "../context/useReaderContext"
import { SettingScopes } from "../settings/SettingScopes"
import { useManagedSetting } from "../settings/useManagedSetting"

export const FontSizeControlsDialog = memo(() => {
  const {
    fontSizeMenuOpen,
    onFontSizeMenuOpenChange,
    fontSizeMin,
    fontSizeMax,
  } = useReaderContextValue([
    "fontSizeMenuOpen",
    "onFontSizeMenuOpenChange",
    "fontSizeMin",
    "fontSizeMax",
  ])
  const fontScale = useManagedSetting("fontScale")

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
              activeScope={fontScale.activeScope}
              onActiveScopeChange={fontScale.onActiveScopeChange}
              renderScopeValue={(scope) => (
                <Slider
                  label={`%`}
                  value={[(fontScale.getValueForScope(scope) ?? 1) * 100]}
                  onValueChange={(details) => {
                    fontScale.changeValueForScope(
                      scope,
                      (details.value[0] ?? 0) / 100,
                    )
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
