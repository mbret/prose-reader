import {
  useReaderContext,
  useReaderContextValue,
} from "../context/useReaderContext"
import { useSyncReaderSetting } from "./useSyncReaderSetting"

/**
 * Keeps the reader on the settings react-reader manages. Each reports a value
 * the reader takes otherwise to the app as `"internal"`, and adopts it as its
 * uncontrolled copy.
 */
export const useSyncManagedSettings = () => {
  const context = useReaderContext()
  const { fontSize, uncontrolledFontSize, spreadMode, uncontrolledSpreadMode } =
    useReaderContextValue([
      "fontSize",
      "uncontrolledFontSize",
      "spreadMode",
      "uncontrolledSpreadMode",
    ])

  useSyncReaderSetting({
    value: fontSize ?? uncontrolledFontSize,
    readReaderValue: (settings) => settings.fontScale,
    toReaderSettings: (fontScale) => ({ fontScale }),
    onReaderValueChange: function adoptFontScaleOfReader(fontScale) {
      context.value.onFontSizeChange?.("internal", fontScale)
      context.update((old) => ({ ...old, uncontrolledFontSize: fontScale }))
    },
  })

  useSyncReaderSetting({
    value: spreadMode ?? uncontrolledSpreadMode,
    readReaderValue: (settings) => settings.spreadMode,
    toReaderSettings: (spreadMode) => ({ spreadMode }),
    onReaderValueChange: function adoptSpreadModeOfReader(spreadMode) {
      context.value.onSpreadModeChange?.("internal", spreadMode)
      context.update((old) => ({ ...old, uncontrolledSpreadMode: spreadMode }))
    },
  })
}
