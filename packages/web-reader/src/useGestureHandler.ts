import * as Hammer from 'hammerjs'
import { useEffect } from 'react'
import { useRecoilCallback, useSetRecoilState } from 'recoil'
import { useReader } from './ReaderProvider'
import { hasCurrentHighlightState, isMenuOpenState } from './state'

export const useGestureHandler = (container: HTMLElement | undefined) => {
  const reader = useReader()
  const setMenuOpenState = useSetRecoilState(isMenuOpenState)

  const handleSingleTap = useRecoilCallback(({ snapshot }) => async ({ srcEvent, target, center }: HammerInput) => {
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

    const normalizedEvent = reader.normalizeEvent(srcEvent)
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

  // useEffect(() => {
  //   setTimeout(() => {
  //     setHasPreviouslyHighlight(hasCurrentHighlight)
  //   }, 5)
  // }, [hasCurrentHighlight, setHasPreviouslyHighlight])

  useEffect(() => {
    const hammer = new Hammer(container || document.body)
    hammer.get('pan').set({ direction: Hammer.DIRECTION_ALL })
    hammer.get('pinch').set({ enable: true })
    hammer.get('press').set({ time: 500 })

    hammer.on('tap', handleSingleTap)

    hammer?.on('panmove panstart panend', onPanMove)

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

      // console.log(`hammer.onPanMove`, ev.type, ev.eventType, (normalizedEvent as any)?.x)

      // if (ev.type === `panstart`) {
      //   if (normalizedEvent && `x` in normalizedEvent) {
      //     movingStarted = true
      //     movingStartOffset = normalizedEvent?.x
      //     reader?.moveTo({ startOffset: movingStartOffset, offset: normalizedEvent?.x })
      //   }
      // }

      // if (ev.type === `panmove`) {
      //   if (normalizedEvent && `x` in normalizedEvent) {
      //     reader?.moveTo({ startOffset: movingStartOffset, offset: normalizedEvent?.x })
      //   }
      // }

      // if (ev.type === `panend` && movingStarted) {
      //   if (normalizedEvent && `x` in normalizedEvent) {
      //     movingStarted = false
      //     return reader?.moveTo({ startOffset: movingStartOffset, offset: normalizedEvent?.x }, { final: true })
      //   }
      // }

      // used to ensure we ignore false positive on firefox
      if (ev.type === `panstart`) {
        hasHadPanStart = true
      }

      // if (!movingStarted && ev.isFinal && !reader?.isSelecting()) {
      if (hasHadPanStart && ev.isFinal && !reader?.isSelecting()) {
        const velocity = ev.velocityX
        console.log(`hammer.onPanMove.velocity`, velocity)
        if (velocity < -0.5) {
          reader?.turnRight()
        }
        if (velocity > 0.5) {
          reader?.turnLeft()
        }
      }

      // used to ensure we ignore false positive on firefox
      if (ev.type === `panend`) {
        hasHadPanStart = false
      }
    }

    return () => {
      hammer.destroy()
    }
  }, [reader, container, setMenuOpenState, handleSingleTap])
}