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
import { useReaderContextValue } from "../context/useReaderContext"
import { SettingScopes } from "../settings/SettingScopes"
import { useManagedSetting } from "../settings/useManagedSetting"
import { FontScaleSlider } from "./FontScaleSlider"

export const FontSizeControlsDialog = memo(() => {
  const { fontSizeMenuOpen, onFontSizeMenuOpenChange } = useReaderContextValue([
    "fontSizeMenuOpen",
    "onFontSizeMenuOpenChange",
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
                <FontScaleSlider
                  fontScale={fontScale.getValueForScope(scope) ?? 1}
                  onFontScaleChange={(changedFontScale) => {
                    fontScale.changeValueForScope(scope, changedFontScale)
                  }}
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
