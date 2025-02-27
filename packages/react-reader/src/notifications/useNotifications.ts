import { isDefined, useSubscribe } from "reactjrx"
import {
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
import { notificationsSignal } from "./notifications"

const useFontScaleChangeNotification = () => {
  const reader = useReader()

  useSubscribe(
    () =>
      reader?.settings.values$.pipe(
        map(({ fontScale }) => fontScale),
        distinctUntilChanged(),
        skip(1),
        tap((fontScale) => {
          notificationsSignal.setValue({
            key: "fontScaleChange",
            title: "Font size changed",
            description: `${fontScale * 100} %`,
          })
        }),
      ),
    [reader],
  )
}

export const useNotifications = () => {
  useFontScaleChangeNotification()

  useSubscribe(() =>
    notificationsSignal.subject.pipe(
      filter(isDefined),
      mergeMap((notification) => {
        const duration = 3000

        const toast = toaster.create({
          title: notification.title,
          description: notification.description,
          duration,
        })

        const sameNotification$ = notificationsSignal.subject.pipe(
          skip(1),
          filter((n) => n?.key === notification.key),
        )

        return merge(timer(duration), sameNotification$).pipe(
          first(),
          finalize(() => {
            toaster.dismiss(toast)
          }),
        )
      }),
    ),
  )
}
