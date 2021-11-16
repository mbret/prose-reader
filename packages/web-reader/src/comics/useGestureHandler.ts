import * as Hammer from 'hammerjs'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useSetRecoilState } from 'recoil'
import { useReader } from '../ReaderProvider'
import { isMenuOpenState } from '../state'

export const useGestureHandler = (container: HTMLElement | undefined, isUsingFreeMode: boolean = false) => {
  const reader = useReader()
  const setMenuOpenState = useSetRecoilState(isMenuOpenState)
  const movingHasStarted = useRef(false)
  const [hammerManager, setHammerManager] = useState<HammerManager | undefined>(undefined)

  const onSingleTap = useCallback(({ srcEvent, target, center }: HammerInput) => {
    if (!reader) return

    const width = window.innerWidth
    const pageTurnMargin = 0.15

    const normalizedEvent = reader.normalizeEventForViewport(srcEvent) || {}

    // console.log('hammer.handleSingleTap', srcEvent.target, srcEvent.type, center, normalizedEvent)

    if (`x` in normalizedEvent) {
      const { x = 0 } = normalizedEvent

      if (
        reader.bookmarks.isClickEventInsideBookmarkArea(normalizedEvent)
      ) {
        return
      }

      if (x < width * pageTurnMargin) {
        reader.turnLeft()
      } else if (x > width * (1 - pageTurnMargin)) {
        reader.turnRight()
      } else {
        setMenuOpenState(val => !val)
      }
    }
  }, [setMenuOpenState, reader])

  useEffect(() => {
    if (container) {
      const newHammerManager = new Hammer.Manager(container || document.body, {
        recognizers: [
          [Hammer.Pan, { direction: Hammer.DIRECTION_ALL }],
          [Hammer.Pinch, { enable: true }],
          [Hammer.Tap, {}],
          [Hammer.Press, {}],
          // [Hammer.Tap, { event: `pressdown`, taps: 1, time: 0 }]
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

      const normalizedEvent = reader?.normalizeEventForViewport(ev.srcEvent)

      // because of iframe moving we have to calculate the delta ourselves with normalized value
      const deltaX = normalizedEvent && `x` in normalizedEvent ? normalizedEvent?.x - movingStartOffsets.x : ev.deltaX
      const deltaY = normalizedEvent && `y` in normalizedEvent ? normalizedEvent?.y - movingStartOffsets.y : ev.deltaY

      // console.warn(ev.type)

      // console.warn(ev.type)

      // used to ensure we ignore false positive on firefox
      if (ev.type === `panstart`) {
        movingHasStarted.current = true

        if (reader?.zoom.isEnabled()) {
          reader.zoom.move(ev.center, { isFirst: true, isLast: false })
        } else {
          if (normalizedEvent && `x` in normalizedEvent) {
            movingStartOffsets = { x: normalizedEvent.x, y: normalizedEvent.y }
            reader?.moveTo({ x: 0, y: 0 }, { start: true })
          }
        }
      }

      if (ev.type === `panmove` && movingHasStarted.current) {
        if (reader?.zoom.isEnabled()) {
          reader.zoom.move({ x: ev.deltaX, y: ev.deltaY }, { isFirst: false, isLast: false })
        } else {
          reader?.moveTo({ x: deltaX, y: deltaY })
        }
      }

      // used to ensure we ignore false positive on firefox
      if (ev.type === `panend`) {
        if (reader?.zoom.isEnabled()) {
          reader.zoom.move(undefined, { isFirst: false, isLast: true })
        } else {
          if (movingHasStarted.current) {
            reader?.moveTo({ x: deltaX, y: deltaY }, { final: true })
          }
        }

        movingHasStarted.current = false
      }
    }

    const onPinch = (ev: HammerInput) => {
      if (reader?.zoom.isEnabled()) {
        reader?.zoom.scale(ev.scale)
      }
    }

    const onPress = (ev: HammerInput) => {
      // console.warn(ev.type)
      // if (ev.type === `press`) {
      //   reader?.moveTo({ x: 0, y: 0 }, { start: true })
      //   movingHasStarted.current = true
      // if (movingHasStarted.current) {
      //   console.warn(`press`)
      //   // reader?.moveTo({ x: 0, y: 0 }, { start: true })
      //   movingHasStarted.current = true
      // } else {
      //   reader?.moveTo(undefined, { final: true })
      // }
      // }
      // if (ev.srcEvent.type === `pointerdown`) {
      // console.warn(ev.type)
      // reader?.moveTo(undefined, { final: true })
      // reader?.moveTo({ x: 0, y: 0 }, { start: true })
      // }

      // if (ev.type === `pressup`) {
      //   if (movingHasStarted.current) {
      //     reader?.moveTo(undefined, { final: true })
      //     movingHasStarted.current = false
      //   }
      // }
    }

    hammerManager?.on(`press pressup`, onPress)
    hammerManager?.on(`tap`, onSingleTap)
    hammerManager?.on(`pinch`, onPinch)
    hammerManager?.on('panmove panstart panend', onPanMove)

    return () => {
      hammerManager?.off(`press pressup`, onPress)
      hammerManager?.off(`tap`, onSingleTap)
      hammerManager?.off(`panmove panstart panend`, onPanMove)
      hammerManager?.off(`pinch`, onPinch)
    }
  }, [reader, setMenuOpenState, onSingleTap, hammerManager, movingHasStarted, isUsingFreeMode])
}