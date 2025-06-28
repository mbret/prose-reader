import { useState } from "react"

export type LocalSettings = {
  navigationGestures: "pan" | "swipe" | "none"
}

export const useLocalSettings = (
  defaultSettings: Partial<LocalSettings> = {},
) => {
  return useState<LocalSettings>({
    navigationGestures: "pan",
    ...defaultSettings,
  })
}
