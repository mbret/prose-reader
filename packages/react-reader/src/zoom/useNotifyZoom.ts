import { watchKeys } from "@prose-reader/core"
import { useSubscribe } from "reactjrx"
import { EMPTY, finalize, NEVER, Subject, switchMap } from "rxjs"
import { useReader } from "../context/useReader"
import { useReaderContext } from "../context/useReaderContext"

export const useNotifyZoom = () => {
  const reader = useReader()
  const { notificationsSubject } = useReaderContext()

  useSubscribe(
    () =>
      reader?.zoom.state$.pipe(
        watchKeys(["isZooming", "currentScale"]),
        switchMap(({ isZooming, currentScale }) => {
          if (!isZooming || currentScale < 1) return EMPTY

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
