import { Tabs } from "@chakra-ui/react"
import { memo } from "react"
import type React from "react"
import { signal, useSignalValue } from "reactjrx"
import { FullScreenDialog } from "../../common/FullScreenDialog"
import { HelpMenu } from "../help/HelpDialog"
import { SearchMenu } from "../search/SearchMenu"
import { SettingsMenu } from "../settings/SettingsMenu"
import type { LocalSettings } from "../settings/useLocalSettings"
import { isQuickMenuOpenSignal } from "../states"
import { AnnotationsMenu } from "./AnnotationsMenu"

export const isMenuOpenSignal = signal({
  default: false,
})

export const MenuDialog = memo(
  ({
    localSettings,
    setLocalSettings,
  }: {
    setLocalSettings: React.Dispatch<React.SetStateAction<LocalSettings>>
    localSettings: LocalSettings
  }) => {
    const isMenuOpen = useSignalValue(isMenuOpenSignal)

    const onNavigate = () => {
      isMenuOpenSignal.setValue(false)
      isQuickMenuOpenSignal.setValue(false)
    }

    return (
      <FullScreenDialog
        isOpen={isMenuOpen}
        onClose={() => {
          isMenuOpenSignal.setValue(false)
        }}
        title="Menu"
      >
        <Tabs.Root
          defaultValue="settings"
          overflow="hidden"
          flex={1}
          display="flex"
          flexDirection="column"
        >
          <Tabs.List overflow="hidden" overflowX="auto" flexShrink={0}>
            <Tabs.Trigger value="settings">Settings</Tabs.Trigger>
            <Tabs.Trigger value="help">Help</Tabs.Trigger>
            <Tabs.Trigger value="annotations">Annotations</Tabs.Trigger>
            <Tabs.Trigger value="search">Search</Tabs.Trigger>
          </Tabs.List>

          <Tabs.Content p={0} display="flex" value="settings">
            <SettingsMenu
              setLocalSettings={setLocalSettings}
              localSettings={localSettings}
              open
            />
          </Tabs.Content>
          <Tabs.Content p={4} value="help">
            <HelpMenu />
          </Tabs.Content>
          <Tabs.Content
            value="annotations"
            display="flex"
            flex={1}
            overflow="auto"
            p={0}
          >
            <AnnotationsMenu onNavigate={onNavigate} />
          </Tabs.Content>
          <Tabs.Content value="search" display="flex" flex={1} overflow="auto">
            <SearchMenu onNavigate={onNavigate} />
          </Tabs.Content>
        </Tabs.Root>
      </FullScreenDialog>
    )
  },
)
