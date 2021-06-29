import * as Hammer from 'hammerjs'
import { useEffect, useRef, useState } from 'react'
import { useRecoilCallback, useSetRecoilState } from 'recoil'
import { useReader } from '../ReaderProvider'
import { hasCurrentHighlightState, isMenuOpenState } from '../state'

export const useGestureHandler = (container: HTMLElement | undefined) => {
  const reader = useReader()
  const setMenuOpenState = useSetRecoilState(isMenuOpenState)
  const movingHasStarted = useRef(false)
  const [hammerManager, setHammerManager] = useState<HammerManager | undefined>(undefined)

  const onSingleTap = useRecoilCallback(({ snapshot }) => async ({ srcEvent, target, center }: HammerInput) => {
    /**
     * @important
     * On touch device `selectionchange` is being triggered after the onclick event, meaning
     * we can detect that there is still a current highlight and therefore hide the menu or not open it.
     * However on desktop (mouse) `selectionchange` is being triggered before the click, meaning we detect
     * no highlight too soon and therefore can show the menu right after a click of the use to deselect text.
     * 
     * @todo
     * Investigate a proper way to not show the menu right after a deselect for mouse devices.
     */
    const hasCurrentHighlight = await snapshot.getPromise(hasCurrentHighlightState)

    if (!reader) return

    const width = window.innerWidth
    const height = window.innerHeight
    const pageTurnMargin = 0.15

    const normalizedEvent = reader?.normalizeEvent(srcEvent) || {}
    console.log('hammer.handleSingleTap', srcEvent.target, srcEvent.type, center, normalizedEvent)

    // if (reader?.getSelection()) return

    if (normalizedEvent?.target) {
      const target = normalizedEvent.target as HTMLElement

      // don't do anything if it was clicked on link
      if (target.nodeName === `a` || target.closest('a')) return
    }

    if (`x` in normalizedEvent) {
      const { x = 0 } = normalizedEvent

      // console.log(srcEvent)

      if (
        reader.bookmarks.isClickEventInsideBookmarkArea(normalizedEvent)
      ) {
        return
      }

      // console.log('hammer.tap', x, width * pageTurnMargin)
      if (x < width * pageTurnMargin) {
        reader.turnLeft()
        // console.log('hammer.tap.left')
      } else if (x > width * (1 - pageTurnMargin)) {
        reader.turnRight()
      } else {
        if (hasCurrentHighlight) {
          setMenuOpenState(false)
        } else {
          setMenuOpenState(val => !val)
        }
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
      const normalizedEvent = reader?.normalizeEvent(ev.srcEvent)

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
  }, [reader, setMenuOpenState, onSingleTap, hammerManager, movingHasStarted])
}