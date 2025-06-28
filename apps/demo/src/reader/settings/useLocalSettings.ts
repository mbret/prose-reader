import { useState } from "react"

export type LocalSettings = {
  navigationGestures: "pan" | "swipe" | "none"
  navigationSnapThreshold: { type: "pixels"; value: number } | undefined
}

export const useLocalSettings = (
  defaultSettings: Partial<LocalSettings> = {},
) => {
  return useState<LocalSettings>({
    navigationGestures: "pan",
    navigationSnapThreshold: undefined,
    ...defaultSettings,
  })
}
