import { memo, useEffect } from "react"
import {
  distinctUntilChanged,
  EMPTY,
  finalize,
  map,
  NEVER,
  skip,
  switchMap,
} from "rxjs"
import { useObserve } from "reactjrx"
import { useReader } from "../useReader"
import { toaster } from "../../components/ui/toaster"

type Notification = {
  type: "fontScaleChange"
  value: number
}

const useNotification = () => {
  const { reader } = useReader()

  return useObserve(
    () =>
      reader?.settings.values$.pipe(
        map(({ fontScale }) => fontScale),
        distinctUntilChanged(),
        skip(1),
        map(
          (fontScale): Notification => ({
            type: "fontScaleChange",
            value: fontScale,
          }),
        ),
      ),
    [reader],
  )
}

export const Notification = memo(() => {
  const notification = useNotification()
  const { reader } = useReader()

  useEffect(() => {
    if (!notification) return

    if (notification.type === "fontScaleChange") {
      toaster.dismiss("fontScaleChange")

      const instance = toaster.create({
        title: "Font size changed",
        description: `${notification.value * 100} %`,
        type: "info",
        duration: 2000,
      })

      return () => {
        toaster.dismiss(instance)
      }
    }
  }, [notification])

  useObserve(
    () =>
      reader?.zoom.isZooming$.pipe(
        switchMap((isZooming) => {
          if (!isZooming) return EMPTY

          const toastId = toaster.create({
            title: "Zooming",
            type: "info",
            duration: 999999,
          })

          return NEVER.pipe(
            finalize(() => {
              toaster.dismiss(toastId)
            }),
          )
        }),
      ),
    [reader],
  )

  return null
})
