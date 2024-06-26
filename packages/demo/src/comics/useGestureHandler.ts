import * as Hammer from "hammerjs"
import { useCallback, useEffect, useRef, useState } from "react"
import { useSetRecoilState } from "recoil"
import { useReaderSettings } from "../common/useReaderSettings"
import { isMenuOpenState } from "../state"
import { useReader } from "../reader/useReader"

export const useGestureHandler = (container: HTMLElement | undefined, isUsingFreeMode = false) => {
  const { reader } = useReader()
  const setMenuOpenState = useSetRecoilState(isMenuOpenState)
  const movingHasStarted = useRef(false)
  const [hammerManager, setHammerManager] = useState<HammerManager | undefined>(undefined)
  const readerSettings = useReaderSettings()
  const isScrollableBook = readerSettings?.computedPageTurnMode === `scrollable`

  const onSingleTap = useCallback(
    ({ srcEvent }: HammerInput) => {
      if (!reader) return

      const width = window.innerWidth
      const pageTurnMargin = 0.15

      const normalizedEvent = reader.events.normalizeEventForViewport(srcEvent) || {}

      if (`x` in normalizedEvent) {
        const { x = 0 } = normalizedEvent

        if (reader.bookmarks.isClickEventInsideBookmarkArea(normalizedEvent)) {
          return
        }

        if (x < width * pageTurnMargin) {
          reader.viewportNavigator.turnLeft()
        } else if (x > width * (1 - pageTurnMargin)) {
          reader.viewportNavigator.turnRight()
        } else {
          setMenuOpenState((val) => !val)
        }
      }
    },
    [setMenuOpenState, reader]
  )

  useEffect(() => {
    if (container) {
      const newHammerManager = new Hammer.Manager(container || document.body, {
        recognizers: [
          [Hammer.Pan, { direction: Hammer.DIRECTION_ALL }],
          [Hammer.Pinch, { enable: true }],
          [Hammer.Tap, {}],
          [Hammer.Press, {}]
        ]
      })

      setHammerManager(newHammerManager)

      return () => {
        newHammerManager.destroy()
        setHammerManager(undefined)
      }
    }
  }, [container, setHammerManager])

  useEffect(() => {
    let movingStartOffsets = { x: 0, y: 0 }
    // let hasHadPanStart = false

    /**
     * @important
     * For some reason, when rapidly clicking on the edges and the navigation happens we also have this
     * event being dispatched. This is a false positive since we are not actually swiping. My guess is that
     * somehow hammer has some problem dealing with iframe changing around right after clicking.
     * Luckily the velocity is usually below 1. Happens a lot on firefox, on chrome just a few panend popup
     * from nowhere
     *
     * @todo
     * Understand the above behavior, try to fix it or come up with solid workaround.
     */
    function onPanMove(ev: HammerInput) {
      if (isUsingFreeMode) {
        return
      }

      const normalizedEvent = reader?.events.normalizeEventForViewport(ev.srcEvent)

      // because of iframe moving we have to calculate the delta ourselves with normalized value
      const deltaX = normalizedEvent && `x` in normalizedEvent ? normalizedEvent?.x - movingStartOffsets.x : ev.deltaX
      const deltaY = normalizedEvent && `y` in normalizedEvent ? normalizedEvent?.y - movingStartOffsets.y : ev.deltaY

      // used to ensure we ignore false positive on firefox
      if (ev.type === `panstart`) {
        movingHasStarted.current = true

        if (reader?.zoom.isZooming()) {
          reader.zoom.move(ev.center, { isFirst: true, isLast: false })
        } else {
          if (normalizedEvent && `x` in normalizedEvent) {
            movingStartOffsets = { x: normalizedEvent.x, y: normalizedEvent.y }
            reader?.viewportNavigator.moveTo({ x: 0, y: 0 }, { start: true })
          }
        }
      }

      if (ev.type === `panmove` && movingHasStarted.current) {
        if (reader?.zoom.isZooming()) {
          reader.zoom.move({ x: ev.deltaX, y: ev.deltaY }, { isFirst: false, isLast: false })
        } else {
          reader?.viewportNavigator.moveTo({ x: deltaX, y: deltaY })
        }
      }

      // used to ensure we ignore false positive on firefox
      if (ev.type === `panend`) {
        if (reader?.zoom.isZooming()) {
          reader.zoom.move(undefined, { isFirst: false, isLast: true })
        } else {
          if (movingHasStarted.current) {
            reader?.viewportNavigator.moveTo({ x: deltaX, y: deltaY }, { final: true })
          }
        }

        movingHasStarted.current = false
      }
    }

    hammerManager?.on(`tap`, onSingleTap)
    hammerManager?.on("panmove panstart panend", onPanMove)

    return () => {
      hammerManager?.off(`tap`, onSingleTap)
      hammerManager?.off(`panmove panstart panend`, onPanMove)
    }
  }, [reader, setMenuOpenState, onSingleTap, hammerManager, movingHasStarted, isUsingFreeMode, isScrollableBook])

  useEffect(() => {
    hammerManager && reader?.hammerGesture.setManagerInstance(hammerManager)
  }, [reader, hammerManager])
}
