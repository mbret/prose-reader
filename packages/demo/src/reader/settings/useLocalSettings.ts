import { useState } from "react"

export type LocalSettings = {
  enablePan: boolean
  enableSwipe: boolean
}

export const useLocalSettings = (defaultSettings: Partial<LocalSettings>) => {
  return useState<LocalSettings>({
    enablePan: true,
    enableSwipe: false,
    ...defaultSettings
  })
}
