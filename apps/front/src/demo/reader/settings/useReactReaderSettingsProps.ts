import type {
  ReactReaderSettings,
  ReactReaderSettingsScopeReference,
} from "@prose-reader/react-reader"
import { useCallback, useMemo } from "react"
import { type Signal, useSignalValue } from "reactjrx"
import type { BookSettings, ReaderSettingsScopes } from "./useBookSettings"
import { useSettings } from "./useSettings"

/** A book whose settings take every value from the global scope. */
const NO_READER_SETTINGS_SCOPES: ReaderSettingsScopes = {}

/**
 * ReactReader's settings props, from what the demo stores: the global values
 * and the values per screen with the local settings, the book's values and the
 * scope of each setting with the book's settings. A value the reader reports
 * as `"internal"`, such as a pinch's, is not saved.
 */
export const useReactReaderSettingsProps = (
  bookSettingsSignal: Signal<BookSettings>,
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

  const onSettingsChange = useCallback(
    function saveSettingsChosenInReader(
      changes: ReactReaderSettings,
      from: ReactReaderSettingsScopeReference | "internal",
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
    settingsScopes:
      bookSettings.readerSettingsScopes ?? NO_READER_SETTINGS_SCOPES,
    onSettingsChange,
    onSettingsScopesChange,
  }
}
