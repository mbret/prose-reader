import { signal, useSignal } from "reactjrx"

export type LocalSettings = {
  navigationGestures: "pan" | "swipe" | "none"
  navigationSnapThreshold: { type: "pixels"; value: number } | undefined
  fontSize?: number
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
    fontSize: hydratedSettings.fontSize ?? undefined,
  },
})

settings.subscribe((settings) => {
  localStorage.setItem("settings", JSON.stringify(settings))
})

export const useSettings = () => {
  return useSignal(settings)
}
