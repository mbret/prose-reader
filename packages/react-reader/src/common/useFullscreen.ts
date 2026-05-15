import { useCallback, useEffect, useState } from "react"
import screenfull from "screenfull"

const readFullscreenSupport = () => screenfull.isEnabled

const readFullscreenState = () =>
  screenfull.isEnabled ? screenfull.isFullscreen : false

export const useFullscreen = () => {
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [isFullscreenSupported, setIsFullscreenSupported] = useState(false)

  const syncFullscreenState = useCallback(() => {
    setIsFullscreen((current) => {
      const next = readFullscreenState()

      return current === next ? current : next
    })
    setIsFullscreenSupported((current) => {
      const next = readFullscreenSupport()

      return current === next ? current : next
    })
  }, [])

  const onToggleFullscreenClick = useCallback(async () => {
    if (!screenfull.isEnabled) {
      syncFullscreenState()

      return
    }

    try {
      if (screenfull.isFullscreen) {
        await screenfull.exit()
      } else {
        await screenfull.request(document.documentElement, {
          navigationUI: `hide`,
        })
      }
    } catch (error) {
      console.error(error)
    } finally {
      syncFullscreenState()
    }
  }, [syncFullscreenState])

  useEffect(() => {
    syncFullscreenState()

    if (!screenfull.isEnabled) return

    screenfull.on(`change`, syncFullscreenState)
    screenfull.on(`error`, syncFullscreenState)

    return () => {
      screenfull.off(`change`, syncFullscreenState)
      screenfull.off(`error`, syncFullscreenState)
    }
  }, [syncFullscreenState])

  return {
    isFullscreen,
    isFullscreenSupported,
    onToggleFullscreenClick,
  }
}
