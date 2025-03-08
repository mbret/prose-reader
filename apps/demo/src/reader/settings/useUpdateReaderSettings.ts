import type { Manifest } from "@prose-reader/core"
import { useEffect } from "react"
import { useObserve } from "reactjrx"
import { useReader } from "../useReader"
import type { LocalSettings } from "./useLocalSettings"

export const useUpdateReaderSettings = ({
  localSettings,
  manifest,
}: { localSettings: LocalSettings; manifest?: Manifest }) => {
  const { reader } = useReader()
  const { computedPageTurnMode } =
    useObserve(() => reader?.settings.values$, [reader]) ?? {}
  const renditionLayout = manifest?.renditionLayout

  useEffect(() => {
    reader?.gestures.settings.update({
      panNavigation:
        computedPageTurnMode === "controlled"
          ? localSettings.enableSwipe
            ? "swipe"
            : localSettings.enablePan
              ? "pan"
              : false
          : false,
    })
  }, [computedPageTurnMode, reader, localSettings])

  useEffect(() => {
    if (renditionLayout === "pre-paginated") {
      reader?.gestures.settings.update({
        panNavigation: "pan",
      })
    } else {
      reader?.gestures.settings.update({
        panNavigation: "swipe",
      })
    }
  }, [renditionLayout, reader])
}
