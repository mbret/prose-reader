import { useEffect } from "react"
import { useReader } from "../useReader"
import type { LocalSettings } from "./useLocalSettings"

export const useUpdateReaderSettings = ({
  localSettings,
}: { localSettings: LocalSettings }) => {
  const { reader } = useReader()

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
