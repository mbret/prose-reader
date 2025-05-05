import { useSubscribe } from "reactjrx"
import { EMPTY, NEVER, Subject, finalize, switchMap } from "rxjs"
import { useReader } from "../context/useReader"
import { useReaderContext } from "../context/useReaderContext"

export const useNotifyZoom = () => {
  const reader = useReader()
  const { notificationsSubject } = useReaderContext()

  useSubscribe(
    () =>
      reader?.zoom.isZooming$.pipe(
        switchMap((isZooming) => {
          if (!isZooming) return EMPTY

          const abort = new Subject<void>()

          notificationsSubject.next({
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
