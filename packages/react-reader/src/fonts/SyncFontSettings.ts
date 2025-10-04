import { useEffect } from "react"
import { useReader } from "../context/useReader"
import { useReaderContextValue } from "../context/useReaderContext"

export const SyncFontSettings = () => {
  const reader = useReader()
  const { fontSize, uncontrolledFontSize } = useReaderContextValue([
    "fontSize",
    "uncontrolledFontSize",
  ])
  const _fontSize = fontSize ?? uncontrolledFontSize

  useEffect(() => {
    if (reader && _fontSize) {
      const timeout = setTimeout(() => {
        reader.settings.update({
          fontScale: _fontSize,
        })
      }, 200)

      return () => clearTimeout(timeout)
    }
  }, [reader, _fontSize])

  return null
}
