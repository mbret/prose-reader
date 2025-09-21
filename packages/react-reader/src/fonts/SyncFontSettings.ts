import { useEffect } from "react"
import { useReader } from "../context/useReader"
import { useReaderContextValue } from "../context/useReaderContext"

export const SyncFontSettings = () => {
  const reader = useReader()
  const { fontSize } = useReaderContextValue(["fontSize"])

  useEffect(() => {
    if (reader && fontSize !== undefined) {
      const timeout = setTimeout(() => {
        reader.settings.update({
          fontScale: fontSize,
        })
      }, 200)

      return () => clearTimeout(timeout)
    }
  }, [reader, fontSize])

  return null
}
