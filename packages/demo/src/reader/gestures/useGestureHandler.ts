import { useEffect } from "react"
import { isMenuOpenState } from "../states"
import { useReader } from "../useReader"
import { useSubscribe } from "reactjrx"
import { NEVER, tap } from "rxjs"
import { isWithinBookmarkArea } from "../bookmarks/isWithinBookmarkArea"

export const useGestureHandler = () => {
  const { reader } = useReader()

  useEffect(() => {
    const deregister = reader?.gestures.hookManager.register("beforeTap", ({ event }) => {
      const target = event.event.target

      if (isWithinBookmarkArea(target)) {
        return false
      }

      return true
    })

    return () => {
      deregister?.()
    }
  }, [reader])

  useSubscribe(
    () =>
      reader?.gestures.unhandledEvent$.pipe(
        tap((event) => {
          /**
           * Toggle menu when tap is not navigating
           */
          if (event.type === "tap") {
            isMenuOpenState.setValue((val) => !val)
          }
        })
      ) ?? NEVER,
    [reader]
  )
}
