import { useEffect } from "react"
import { useSubscribe } from "reactjrx"
import { map } from "rxjs"
import { useReader } from "../context/useReader"
import {
  useReaderContext,
  useReaderContextValue,
} from "../context/useReaderContext"

export const SyncFontSettings = () => {
  const reader = useReader()
  const context = useReaderContext()
  const { fontSize, uncontrolledFontSize } = useReaderContextValue([
    "fontSize",
    "uncontrolledFontSize",
    "onFontSizeChange",
  ])
  const _fontSize = fontSize ?? uncontrolledFontSize

  useEffect(
    function syncDownFontSize() {
      if (reader && _fontSize) {
        const timeout = setTimeout(() => {
          reader.settings.update({
            fontScale: _fontSize,
          })
        }, 200)

        return () => clearTimeout(timeout)
      }
    },
    [reader, _fontSize],
  )

  useSubscribe(
    function syncUpFontSize() {
      return reader?.settings.values$
        .pipe(map((settings) => settings.fontScale))
        .subscribe((fontScale) => {
          const _fontSize =
            context.value.fontSize ?? context.value.uncontrolledFontSize

          if (fontScale !== _fontSize) {
            context.value.onFontSizeChange?.("internal", fontScale)
            context.update((old) => ({
              ...old,
              uncontrolledFontSize: fontScale,
            }))
          }
        })
    },
    [reader, context],
  )

  return null
}
