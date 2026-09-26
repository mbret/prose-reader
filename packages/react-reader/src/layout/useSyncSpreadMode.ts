import {
  useReaderContext,
  useReaderContextValue,
} from "../context/useReaderContext"
import { useSyncReaderSetting } from "../settings/useSyncReaderSetting"

export const useSyncSpreadMode = () => {
  const context = useReaderContext()
  const { spreadMode, uncontrolledSpreadMode } = useReaderContextValue([
    "spreadMode",
    "uncontrolledSpreadMode",
  ])

  useSyncReaderSetting({
    value: spreadMode ?? uncontrolledSpreadMode,
    readReaderValue: (settings) => settings.spreadMode,
    toReaderSettings: (spreadMode) => ({ spreadMode }),
    onReaderValueChange: function reportSpreadModeOfReader(spreadMode) {
      context.value.onSpreadModeChange?.("internal", spreadMode)
      context.update((old) => ({ ...old, uncontrolledSpreadMode: spreadMode }))
    },
  })
}
