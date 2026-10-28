import type {
  ReactReaderSettings,
  ReactReaderSettingsScopeReference,
} from "@prose-reader/react-reader"
import { signal, useSignal } from "reactjrx"

/** The screens of react-reader's screen scope. */
export type ScreenSettingsScopeReference = Exclude<
  ReactReaderSettingsScopeReference,
  "global" | "book"
>

export type LocalSettings = {
  navigationGestures: "pan" | "swipe" | "none"
  navigationSnapThreshold: { type: "pixels"; value: number } | undefined
  /** The global values of the settings react-reader manages. */
  readerSettings: ReactReaderSettings
  /** Their values for each screen. */
  readerSettingsByScreen: Partial<
    Record<ScreenSettingsScopeReference, ReactReaderSettings>
  >
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
