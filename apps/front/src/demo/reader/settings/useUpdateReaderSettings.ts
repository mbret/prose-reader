import { useReader } from "@prose-reader/react-reader"
import { useEffect } from "react"
import type { LocalSettings } from "./useSettings"

export const useUpdateReaderSettings = ({
  localSettings,
}: {
  localSettings: LocalSettings
}) => {
  const reader = useReader()

  useEffect(() => {
    reader?.gestures.settings.update({
      panNavigation:
        localSettings.navigationGestures === "pan"
          ? "pan"
          : localSettings.navigationGestures === "swipe"
            ? "swipe"
            : false,
    })
  }, [reader, localSettings])
}
