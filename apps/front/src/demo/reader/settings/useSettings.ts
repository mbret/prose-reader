import type { CoreInputSettings } from "@prose-reader/core"
import { signal, useSignal } from "reactjrx"

export type LocalSettings = {
  navigationGestures: "pan" | "swipe" | "none"
  navigationSnapThreshold: { type: "pixels"; value: number } | undefined
  fontSizeGlobal?: number
  fontSizeScreenMobile?: number
  fontSizeScreenTablet?: number
  fontSizeScreenDesktop?: number
  spreadModeGlobal?: CoreInputSettings["spreadMode"]
  spreadModeScreenMobile?: CoreInputSettings["spreadMode"]
  spreadModeScreenTablet?: CoreInputSettings["spreadMode"]
  spreadModeScreenDesktop?: CoreInputSettings["spreadMode"]
}

const hydratedSettings = ((): Partial<LocalSettings> => {
  const _settings = localStorage.getItem("settings") || "{}"

  try {
    return JSON.parse(_settings)
  } catch (error) {
    console.error(error)

    return {}
  }
})()

const settings = signal<LocalSettings>({
  default: {
    navigationGestures: hydratedSettings.navigationGestures ?? "pan",
    navigationSnapThreshold:
      hydratedSettings.navigationSnapThreshold ?? undefined,
    fontSizeGlobal: hydratedSettings.fontSizeGlobal ?? undefined,
    fontSizeScreenMobile: hydratedSettings.fontSizeScreenMobile ?? undefined,
    fontSizeScreenTablet: hydratedSettings.fontSizeScreenTablet ?? undefined,
    fontSizeScreenDesktop: hydratedSettings.fontSizeScreenDesktop ?? undefined,
    spreadModeGlobal: hydratedSettings.spreadModeGlobal ?? undefined,
    spreadModeScreenMobile:
      hydratedSettings.spreadModeScreenMobile ?? undefined,
    spreadModeScreenTablet:
      hydratedSettings.spreadModeScreenTablet ?? undefined,
    spreadModeScreenDesktop:
      hydratedSettings.spreadModeScreenDesktop ?? undefined,
  },
})

settings.subscribe((settings) => {
  localStorage.setItem("settings", JSON.stringify(settings))
})

export const useSettings = () => {
  return useSignal(settings)
}
