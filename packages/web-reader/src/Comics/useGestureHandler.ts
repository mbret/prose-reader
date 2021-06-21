import * as Hammer from 'hammerjs'
import { useEffect, useState } from 'react'
import { useRecoilCallback, useSetRecoilState } from 'recoil'
import { useReader } from '../ReaderProvider'
import { hasCurrentHighlightState, isMenuOpenState } from '../state'

export const useGestureHandler = (container: HTMLElement | undefined) => {
  const reader = useReader()
  const setMenuOpenState = useSetRecoilState(isMenuOpenState)
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

      console.log(srcEvent)

      if (
        reader.bookmarks.isClickEventInsideBookmarkArea(normalizedEvent)
        || reader.highlights.isHighlightClicked(srcEvent)
      ) {
        return
      }

      console.log('hammer.tap', x, width * pageTurnMargin)
      if (x < width * pageTurnMargin) {
        reader.turnLeft()
        console.log('hammer.tap.left')
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
          [Hammer.Tap, {}]
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
    let movingStarted = false
    let movingStartOffset = 0
    let hasHadPanStart = false

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
      const deltaX = normalizedEvent && `x` in normalizedEvent ? normalizedEvent?.x - movingStartOffset : ev.deltaX

      // used to ensure we ignore false positive on firefox
      if (ev.type === `panstart`) {
        hasHadPanStart = true

        if (reader?.zoom.isEnabled()) {
          reader.zoom.move(ev.center, { isFirst: true, isLast: false })
        } else {
          if (normalizedEvent && `x` in normalizedEvent) {
            movingStarted = true
            movingStartOffset = normalizedEvent?.x
            reader?.moveTo({ x: 0, y: 0 })
          }
        }
      }

      if (ev.type === `panmove` && hasHadPanStart) {
        if (reader?.zoom.isEnabled()) {
          reader.zoom.move({ x: ev.deltaX, y: ev.deltaY }, { isFirst: false, isLast: false })
        } else {
          reader?.moveTo({ x: deltaX, y: ev.deltaY })
        }
      }

      // used to ensure we ignore false positive on firefox
      if (ev.type === `panend`) {
        hasHadPanStart = false
        movingStarted = false

        if (reader?.zoom.isEnabled()) {
          reader.zoom.move(undefined, { isFirst: false, isLast: true })
        } else {
          return reader?.moveTo({ x: deltaX, y: ev.deltaY }, { final: true })
        }
      }
    }

    const onPinch = (ev: HammerInput) => {
      if (reader?.zoom.isEnabled()) {
        reader?.zoom.scale(ev.scale)
      }
    }

    hammerManager?.on(`tap`, onSingleTap)
    hammerManager?.on(`pinch`, onPinch)
    hammerManager?.on('panmove panstart panend', onPanMove)

    return () => {
      hammerManager?.off(`tap`, onSingleTap)
      hammerManager?.off(`panmove panstart panend`, onPanMove)
      hammerManager?.off(`pinch`, onPinch)
    }
  }, [reader, setMenuOpenState, onSingleTap, hammerManager])
}