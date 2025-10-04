import { isDefined, useSubscribe } from "reactjrx"
import {
  filter,
  finalize,
  first,
  merge,
  mergeMap,
  NEVER,
  Observable,
  skip,
  switchMap,
  timer,
} from "rxjs"
import { toaster } from "../components/ui/toaster"
import { useReaderContextValue } from "../context/useReaderContext"
import { useFontSizeNotifications } from "../fonts/useFontSizeNotifications"

export const useNotifications = () => {
  const { notificationsSubject } = useReaderContextValue([
    "notificationsSubject",
  ])

  useFontSizeNotifications()

  useSubscribe(
    () =>
      notificationsSubject.pipe(
        filter(isDefined),
        mergeMap((notification) => {
          const duration = notification.duration ?? 3000

          const toast$ = new Observable<string>((subscriber) => {
            try {
              queueMicrotask(() => {
                const toastId = toaster.create({
                  title: notification.title,
                  description: notification.description,
                  duration,
                })

                subscriber.next(toastId)
                subscriber.complete()
              })
            } catch (error) {
              subscriber.error(error)
            }
          })

          const sameNotification$ = notificationsSubject.pipe(
            skip(1),
            filter((n) => !!notification.key && n?.key === notification.key),
          )

          return toast$.pipe(
            switchMap((toast) =>
              merge(
                timer(duration),
                notification.abort ?? NEVER,
                sameNotification$,
              ).pipe(
                first(),
                finalize(() => {
                  queueMicrotask(() => {
                    toaster.dismiss(toast)
                  })
                }),
              ),
            ),
          )
        }),
      ),
    [notificationsSubject],
  )
}
