import { isDefined, useSubscribe } from "reactjrx"
import {
  NEVER,
  distinctUntilChanged,
  filter,
  finalize,
  first,
  map,
  merge,
  mergeMap,
  skip,
  tap,
  timer,
} from "rxjs"
import { toaster } from "../components/ui/toaster"
import { useReader } from "../context/useReader"
import { useReaderContext } from "../context/useReaderContext"
import { useNotifyZoom } from "../zoom/useNotifyZoom"

const useNotifyFontScaleChange = () => {
  const reader = useReader()
  const { notificationsSubject } = useReaderContext()

  useSubscribe(
    () =>
      reader?.settings.values$.pipe(
        map(({ fontScale }) => fontScale),
        distinctUntilChanged(),
        skip(1),
        tap((fontScale) => {
          notificationsSubject.next({
            key: "fontScaleChange",
            title: "Font size changed",
            description: `${fontScale * 100} %`,
          })
        }),
      ),
    [reader, notificationsSubject],
  )
}

export const useNotifications = () => {
  const { notificationsSubject } = useReaderContext()

  useNotifyFontScaleChange()
  useNotifyZoom()

  useSubscribe(
    () =>
      notificationsSubject.pipe(
        filter(isDefined),
        mergeMap((notification) => {
          const duration = notification.duration ?? 3000

          const toast = toaster.create({
            title: notification.title,
            description: notification.description,
            duration,
          })

          const sameNotification$ = notificationsSubject.pipe(
            skip(1),
            filter((n) => !!notification.key && n?.key === notification.key),
          )

          return merge(
            timer(duration),
            notification.abort ?? NEVER,
            sameNotification$,
          ).pipe(
            first(),
            finalize(() => {
              toaster.dismiss(toast)
            }),
          )
        }),
      ),
    [notificationsSubject],
  )
}
