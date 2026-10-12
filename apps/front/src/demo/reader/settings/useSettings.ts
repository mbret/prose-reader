import { signal, useSignal } from "reactjrx"
import type {
  ReaderSettings,
  ScreenScopeReference,
} from "./reactReaderSettings"

export type LocalSettings = {
  navigationGestures: "pan" | "swipe" | "none"
  navigationSnapThreshold: { type: "pixels"; value: number } | undefined
  /** The global values of the settings react-reader manages. */
  readerSettings: ReaderSettings
  /** Their values for each screen. */
  readerSettingsByScreen: Partial<Record<ScreenScopeReference, ReaderSettings>>
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
    readerSettings: hydratedSettings.readerSettings ?? {},
    readerSettingsByScreen: hydratedSettings.readerSettingsByScreen ?? {},
  },
})

settings.subscribe((settings) => {
  localStorage.setItem("settings", JSON.stringify(settings))
})

export const useSettings = () => {
  return useSignal(settings)
}
