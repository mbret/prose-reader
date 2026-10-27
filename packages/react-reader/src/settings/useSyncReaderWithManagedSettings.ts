import {
  useReaderContext,
  useReaderContextValue,
} from "../context/useReaderContext"
import { useSyncReaderSettingWithManagedValue } from "./useSyncReaderSettingWithManagedValue"

/**
 * How long the font size and the spread mode have to stay before they are
 * written into the reader, so a slider dragged across sizes writes once.
 */
const MENU_SETTING_WRITE_DELAY_MS = 200

/**
 * Keeps the reader on the settings react-reader manages. A value the reader
 * takes otherwise is reported to the app as `"internal"`, and adopted as
 * react-reader's own copy.
 */
export const useSyncReaderWithManagedSettings = () => {
  const context = useReaderContext()
  const {
    fontSize,
    uncontrolledFontSize,
    spreadMode,
    uncontrolledSpreadMode,
    theme,
    uncontrolledTheme,
  } = useReaderContextValue([
    "fontSize",
    "uncontrolledFontSize",
    "spreadMode",
    "uncontrolledSpreadMode",
    "theme",
    "uncontrolledTheme",
  ])

  useSyncReaderSettingWithManagedValue({
    appValue: fontSize,
    uncontrolledValue: uncontrolledFontSize,
    readReaderValue: (settings) => settings.fontScale,
    toReaderSettings: (fontScale) => ({ fontScale }),
    onReaderValueChange: function adoptFontScaleOfReader(fontScale) {
      context.value.onFontSizeChange?.("internal", fontScale)
      context.update((old) => ({ ...old, uncontrolledFontSize: fontScale }))
    },
    writeDelayMs: MENU_SETTING_WRITE_DELAY_MS,
  })

  useSyncReaderSettingWithManagedValue({
    appValue: spreadMode,
    uncontrolledValue: uncontrolledSpreadMode,
    readReaderValue: (settings) => settings.spreadMode,
    toReaderSettings: (spreadMode) => ({ spreadMode }),
    onReaderValueChange: function adoptSpreadModeOfReader(spreadMode) {
      context.value.onSpreadModeChange?.("internal", spreadMode)
      context.update((old) => ({ ...old, uncontrolledSpreadMode: spreadMode }))
    },
    writeDelayMs: MENU_SETTING_WRITE_DELAY_MS,
  })

  useSyncReaderSettingWithManagedValue({
    appValue: theme,
    uncontrolledValue: uncontrolledTheme,
    readReaderValue: (settings) => settings.theme,
    toReaderSettings: (theme) => ({ theme }),
    onReaderValueChange: function adoptThemeOfReader(theme) {
      context.value.onThemeChange?.("internal", theme)
      context.update((old) => ({ ...old, uncontrolledTheme: theme }))
    },
    writeDelayMs: 0,
  })
}
