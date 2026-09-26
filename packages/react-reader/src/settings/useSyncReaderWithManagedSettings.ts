import {
  useReaderContext,
  useReaderContextValue,
} from "../context/useReaderContext"
import { useSyncReaderSettingWithManagedValue } from "./useSyncReaderSettingWithManagedValue"

/**
 * Keeps the reader on the settings react-reader manages. A value the reader
 * takes otherwise is reported to the app as `"internal"`, and adopted as
 * react-reader's own copy.
 */
export const useSyncReaderWithManagedSettings = () => {
  const context = useReaderContext()
  const { fontSize, uncontrolledFontSize, spreadMode, uncontrolledSpreadMode } =
    useReaderContextValue([
      "fontSize",
      "uncontrolledFontSize",
      "spreadMode",
      "uncontrolledSpreadMode",
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
  })
}
