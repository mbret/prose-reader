import { Reader } from "@prose-reader/core"
import * as Hammer from 'hammerjs'
import { postMessage } from "./messages"

export const createGestureHandler = (reader: Reader) => {
  const hammerManager = new Hammer.Manager(document.body, {
    recognizers: [
      [Hammer.Pan, { direction: Hammer.DIRECTION_ALL }],
      [Hammer.Pinch, { enable: true }],
      [Hammer.Tap, {}],
      [Hammer.Press, {}],
    ],
  })

  hammerManager?.on('tap', ({ srcEvent }: HammerInput) => {
    const width = window.innerWidth
    const pageTurnMargin = 0.15

    const normalizedEvent = reader?.normalizeEventForViewport(srcEvent) || {}

    if ('x' in normalizedEvent) {
      const { x = 0 } = normalizedEvent

      if (x < width * pageTurnMargin) {
        reader.turnLeft()
      } else if (x > width * (1 - pageTurnMargin)) {
        reader.turnRight()
      } else {
        postMessage({ event: 'menuTap' })
      }
    }
  })

  let movingStartOffset = 0
  let movingHasStarted = false

  hammerManager.on('panmove panstart panend', (ev: HammerInput) => {
    const normalizedEvent = reader?.normalizeEventForViewport(ev.srcEvent)

    // because of iframe moving we have to calculate the delta ourselves with normalized value
    const deltaX = normalizedEvent && 'x' in normalizedEvent ? normalizedEvent?.x - movingStartOffset : ev.deltaX

    if (ev.type === 'panstart') {
      movingHasStarted = true

      if (normalizedEvent && 'x' in normalizedEvent) {
        movingStartOffset = normalizedEvent?.x
        reader?.moveTo({ x: 0, y: 0 }, { start: true })
      }
    }

    if (ev.type === 'panmove' && movingHasStarted) {
      if (movingHasStarted) {
        reader?.moveTo({ x: deltaX, y: ev.deltaY })
      }
    }

    if (ev.type === 'panend') {
      // used to ensure we ignore false positive on firefox
      if (movingHasStarted) {
        reader?.moveTo({ x: deltaX, y: ev.deltaY }, { final: true })
      }

      movingHasStarted = false
    }
  })
}