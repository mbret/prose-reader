import { isDefined, useSubscribe } from "reactjrx"
import {
  distinctUntilChanged,
  EMPTY,
  filter,
  finalize,
  first,
  map,
  merge,
  mergeMap,
  NEVER,
  Observable,
  skip,
  switchMap,
  tap,
  timer,
} from "rxjs"
import { toaster } from "../components/ui/toaster"
import { useReader } from "../context/useReader"
import { useReaderContextValue } from "../context/useReaderContext"

export const NOTIFICATION_KEYS = {
  fontScaleChange: "fontScaleChange",
}

const useNotifyFontScaleChange = () => {
  const reader = useReader()
  const { notificationsSubject, fontSizeMenuOpen } = useReaderContextValue([
    "notificationsSubject",
    "fontSizeMenuOpen",
  ])

  useSubscribe(
    () =>
      fontSizeMenuOpen
        ? EMPTY
        : reader?.settings.values$.pipe(
            map(({ fontScale }) => fontScale),
            distinctUntilChanged(),
            skip(1),
            tap((fontScale) => {
              notificationsSubject.next({
                key: NOTIFICATION_KEYS.fontScaleChange,
                title: "Font size changed",
                description: `${fontScale * 100} %`,
              })
            }),
          ),
    [reader, notificationsSubject, fontSizeMenuOpen],
  )
}

export const useNotifications = () => {
  const { notificationsSubject } = useReaderContextValue([
    "notificationsSubject",
  ])

  useNotifyFontScaleChange()

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
