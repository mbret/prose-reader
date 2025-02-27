import { useSubscribe } from "reactjrx"
import { EMPTY, NEVER, Subject, finalize, switchMap } from "rxjs"
import { useReader } from "../context/useReader"
import { notificationsSignal } from "../notifications/notifications"

export const useNotifyZoom = () => {
  const reader = useReader()

  useSubscribe(
    () =>
      reader?.zoom.isZooming$.pipe(
        switchMap((isZooming) => {
          if (!isZooming) return EMPTY

          const abort = new Subject<void>()

          notificationsSignal.setValue({
            key: "zoom",
            title: "Zooming",
            duration: 999999,
            abort: abort,
          })

          return NEVER.pipe(
            finalize(() => {
              abort.next()
              abort.complete()
            }),
          )
        }),
      ),
    [reader],
  )
}
