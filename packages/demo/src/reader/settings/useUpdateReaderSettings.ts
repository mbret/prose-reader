import { useEffect } from "react"
import { useReader } from "../useReader"
import { useObserve } from "reactjrx"
import { NEVER } from "rxjs"
import { LocalSettings } from "./useLocalSettings"

export const useUpdateReaderSettings = (localSettings: LocalSettings) => {
  const { reader } = useReader()
  const { computedPageTurnMode } = useObserve(() => reader?.settings.values$ ?? NEVER, [reader]) ?? {}

  useEffect(() => {
    reader?.gestures.settings.update({
      panNavigation:
        computedPageTurnMode === "controlled"
          ? localSettings.enableSwipe
            ? "swipe"
            : localSettings.enablePan
              ? "pan"
              : false
          : false
    })
  }, [computedPageTurnMode, reader, localSettings])
}
