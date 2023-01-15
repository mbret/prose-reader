import React from "react"
import { Reader } from "@prose-reader/core"
import { Settings } from "../common/Settings"
import { NavigationSettings } from "../common/NavigationSettings"
import { OtherSettings } from "../common/OtherSettings"

export const ComicsSettings = ({ reader, open, onExit }: { reader: Reader; open: boolean; onExit: () => void }) => {
  return (
    <Settings open={open} onExit={onExit}>
      <NavigationSettings reader={reader} />
      <OtherSettings />
    </Settings>
  )
}
