import { memo } from "react"
import { useObserve } from "reactjrx"
import { EMPTY, NEVER, finalize, switchMap } from "rxjs"
import { toaster } from "../../components/ui/toaster"
import { useReader } from "../useReader"

export const Notification = memo(() => {
  const { reader } = useReader()

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
