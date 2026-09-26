import type { CoreInputSettings } from "@prose-reader/core"
import { type Signal, useSignalValue } from "reactjrx"
import type { BookSettings } from "./useBookSettings"
import { type ScreenScopeReference, useScopedSetting } from "./useScopedSetting"
import { useSettings } from "./useSettings"

export const useSpreadModeSettings = (
  bookSettingsSignal: Signal<BookSettings>,
  screen?: ScreenScopeReference,
) => {
  const [localSettings, setLocalSettings] = useSettings()
  const bookSettings = useSignalValue(bookSettingsSignal)

  return useScopedSetting({
    scope: bookSettings.spreadModeScope,
    screen,
    values: {
      global: localSettings.spreadModeGlobal,
      book: bookSettings.spreadMode,
      mobile: localSettings.spreadModeScreenMobile,
      tablet: localSettings.spreadModeScreenTablet,
      desktop: localSettings.spreadModeScreenDesktop,
    },
    saveValue: function saveSpreadMode(
      reference,
      spreadMode: CoreInputSettings["spreadMode"],
    ) {
      switch (reference) {
        case "global":
          setLocalSettings((old) => ({ ...old, spreadModeGlobal: spreadMode }))
          break
        case "book":
          bookSettingsSignal.update((old) => ({ ...old, spreadMode }))
          break
        case "mobile":
          setLocalSettings((old) => ({
            ...old,
            spreadModeScreenMobile: spreadMode,
          }))
          break
        case "tablet":
          setLocalSettings((old) => ({
            ...old,
            spreadModeScreenTablet: spreadMode,
          }))
          break
        case "desktop":
          setLocalSettings((old) => ({
            ...old,
            spreadModeScreenDesktop: spreadMode,
          }))
          break
      }
    },
    saveScope: function saveSpreadModeScope(spreadModeScope) {
      bookSettingsSignal.update((old) => ({ ...old, spreadModeScope }))
    },
  })
}
