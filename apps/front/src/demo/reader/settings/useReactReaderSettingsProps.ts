import { useCallback, useMemo } from "react"
import { type Signal, useSignalValue } from "reactjrx"
import type {
  ReaderSettings,
  ReaderSettingsChangeOrigin,
  ReaderSettingsScopes,
  ScreenScopeReference,
} from "./reactReaderSettings"
import type { BookSettings } from "./useBookSettings"
import { useSettings } from "./useSettings"

/**
 * ReactReader's settings props, from what the demo stores: the global values
 * and the values per screen with the local settings, the book's values and the
 * scope of each setting with the book's settings. A value the reader reports
 * as `"internal"`, such as a pinch's, is not saved.
 */
export const useReactReaderSettingsProps = (
  bookSettingsSignal: Signal<BookSettings>,
  screen: ScreenScopeReference | undefined,
) => {
  const [localSettings, setLocalSettings] = useSettings()
  const bookSettings = useSignalValue(bookSettingsSignal)

  const settingsByScope = useMemo(
    () => ({
      ...localSettings.readerSettingsByScreen,
      book: bookSettings.readerSettings,
    }),
    [localSettings.readerSettingsByScreen, bookSettings.readerSettings],
  )

  const settingsScopes = useMemo(
    () =>
      Object.fromEntries(
        Object.entries(bookSettings.readerSettingsScopes ?? {}).map(
          ([name, scope]) => [
            name,
            scope === "screen" ? (screen ?? "desktop") : scope,
          ],
        ),
      ),
    [bookSettings.readerSettingsScopes, screen],
  )

  const onSettingsChange = useCallback(
    function saveSettingsChosenInReader(
      changes: ReaderSettings,
      from: ReaderSettingsChangeOrigin,
    ) {
      if (from === "internal") return

      if (from === "global") {
        setLocalSettings((old) => ({
          ...old,
          readerSettings: { ...old.readerSettings, ...changes },
        }))
      } else if (from === "book") {
        bookSettingsSignal.update((old) => ({
          ...old,
          readerSettings: { ...old.readerSettings, ...changes },
        }))
      } else {
        setLocalSettings((old) => ({
          ...old,
          readerSettingsByScreen: {
            ...old.readerSettingsByScreen,
            [from]: { ...old.readerSettingsByScreen[from], ...changes },
          },
        }))
      }
    },
    [bookSettingsSignal, setLocalSettings],
  )

  const onSettingsScopesChange = useCallback(
    function saveScopesChosenInReader(changes: ReaderSettingsScopes) {
      bookSettingsSignal.update((old) => ({
        ...old,
        readerSettingsScopes: { ...old.readerSettingsScopes, ...changes },
      }))
    },
    [bookSettingsSignal],
  )

  return {
    settings: localSettings.readerSettings,
    settingsByScope,
    settingsScopes,
    onSettingsChange,
    onSettingsScopesChange,
  }
}
