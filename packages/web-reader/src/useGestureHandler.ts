import * as Hammer from 'hammerjs'
import { useEffect } from 'react'
import { useSetRecoilState } from 'recoil'
import { useReader } from './ReaderProvider'
import { isMenuOpenState } from './state'

export const useGestureHandler = (container: HTMLElement | undefined) => {
  const reader = useReader()
  const setMenuOpenState = useSetRecoilState(isMenuOpenState)

  useEffect(() => {
    const hammer = new Hammer(container || document.body)
    hammer.get('pan').set({ direction: Hammer.DIRECTION_ALL })
    hammer.get('pinch').set({ enable: true })
    hammer.get('press').set({ time: 500 })

    hammer.on('tap', function (ev) {
      handleSingleTap(ev)
    })

    hammer?.on('panmove panstart panend', onPanMove)

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

      // used to ensure we ignore false positive on firefox
      if (ev.type === `panstart`) {
        hasHadPanStart = true
      }

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

    function handleSingleTap({ srcEvent, target, center }: HammerInput) {
      if (!reader) return

      const width = window.innerWidth
      const height = window.innerHeight
      const pageTurnMargin = 0.15

      const normalizedEvent = reader.normalizeEvent(srcEvent)
      console.log('handleSingleTap', srcEvent.target, srcEvent.type, center)

      if (reader?.getSelection()) return

      if (normalizedEvent?.target) {
        const target = normalizedEvent.target as HTMLElement

        // don't do anything if it was clicked on link
        if (target.nodeName === `a` || target.closest('a')) return
      }

      if (`x` in normalizedEvent) {
        const { x = 0 } = normalizedEvent

        if (reader.bookmarks.isClickEventInsideBookmarkArea(normalizedEvent)) {
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
    }

    return () => {
      hammer.destroy()
    }
  }, [reader, container, setMenuOpenState])
}