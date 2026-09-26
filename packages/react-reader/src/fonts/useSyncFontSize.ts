import {
  useReaderContext,
  useReaderContextValue,
} from "../context/useReaderContext"
import { useSyncReaderSetting } from "../settings/useSyncReaderSetting"

export const useSyncFontSize = () => {
  const context = useReaderContext()
  const { fontSize, uncontrolledFontSize } = useReaderContextValue([
    "fontSize",
    "uncontrolledFontSize",
  ])

  useSyncReaderSetting({
    value: fontSize ?? uncontrolledFontSize,
    readReaderValue: (settings) => settings.fontScale,
    toReaderSettings: (fontScale) => ({ fontScale }),
    onReaderValueChange: function reportFontScaleOfReader(fontScale) {
      context.value.onFontSizeChange?.("internal", fontScale)
      context.update((old) => ({ ...old, uncontrolledFontSize: fontScale }))
    },
  })
}
