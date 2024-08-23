import { memo, useEffect } from "react"
import { distinctUntilChanged, EMPTY, finalize, map, NEVER, skip, switchMap } from "rxjs"
import { useObserve } from "reactjrx"
import { useReader } from "../useReader"
import { useToast } from "@chakra-ui/react"

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
        map((fontScale): Notification => ({ type: "fontScaleChange", value: fontScale }))
      ),
    [reader]
  )
}

export const Notification = memo(() => {
  const notification = useNotification()
  const { reader } = useReader()
  const toast = useToast()

  useEffect(() => {
    if (!notification) return

    if (notification.type === "fontScaleChange") {
      toast.close("fontScaleChange")

      const instance = toast({
        title: "Font size changed",
        description: `${notification.value * 100} %`,
        status: "info",
        duration: 2000
      })

      return () => {
        toast.close(instance)
      }
    }
  }, [notification, toast])

  useObserve(
    () =>
      reader?.zoom.isZooming$.pipe(
        switchMap((isZooming) => {
          if (!isZooming) return EMPTY

          const toastId = toast({
            title: "Zooming",
            status: "info",
            duration: 999999
          })

          return NEVER.pipe(
            finalize(() => {
              toast.close(toastId)
            })
          )
        })
      ),
    [reader, toast]
  )

  return null
})
