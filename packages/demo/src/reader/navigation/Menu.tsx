import { memo, useState } from "react"
import { FullScreenModal } from "../../common/FullScreenModal"
import { signal, useSignalValue } from "reactjrx"
import { Tab, TabList, TabPanel, TabPanels, Tabs } from "@chakra-ui/react"
import React from "react"
import { HelpMenu } from "../help/HelpDialog"
import { TocMenu } from "./TocMenu"
import { SearchMenu } from "../search/SearchMenu"
import { isQuickMenuOpenSignal } from "../states"
import { SettingsMenu } from "../settings/SettingsMenu"
import { LocalSettings } from "../settings/useLocalSettings"

export const isMenuOpenSignal = signal({
  default: false
})

export const Menu = memo(
  ({
    localSettings,
    setLocalSettings
  }: {
    setLocalSettings: React.Dispatch<React.SetStateAction<LocalSettings>>
    localSettings: LocalSettings
  }) => {
    const isMenuOpen = useSignalValue(isMenuOpenSignal)
    const [tabIndex, setTabIndex] = useState(0)

    const handleTabsChange = (index: number) => {
      setTabIndex(index)
    }

    return (
      <FullScreenModal
        isOpen={isMenuOpen}
        onClose={() => {
          isMenuOpenSignal.setValue(false)
        }}
        title="Menu"
      >
        <Tabs index={tabIndex} onChange={handleTabsChange} overflow="hidden" flex={1} display="flex" flexDirection="column">
          <TabList>
            <Tab>Settings</Tab>
            <Tab>Help</Tab>
            <Tab>TOC</Tab>
            <Tab>Search</Tab>
          </TabList>

          <TabPanels overflow="hidden" display="flex">
            <TabPanel p={0} display="flex">
              <SettingsMenu setLocalSettings={setLocalSettings} localSettings={localSettings} open />
            </TabPanel>
            <TabPanel p={4}>
              <HelpMenu />
            </TabPanel>
            <TabPanel p={0} display="flex">
              <TocMenu
                onNavigate={() => {
                  isMenuOpenSignal.setValue(false)
                  isQuickMenuOpenSignal.setValue(false)
                }}
              />
            </TabPanel>
            <TabPanel>
              {tabIndex === 3 && (
                <SearchMenu
                  onNavigate={() => {
                    isMenuOpenSignal.setValue(false)
                    isQuickMenuOpenSignal.setValue(false)
                  }}
                />
              )}
            </TabPanel>
          </TabPanels>
        </Tabs>
      </FullScreenModal>
    )
  }
)
