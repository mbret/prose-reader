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
import { useNotifyZoom } from "../zoom/useNotifyZoom"
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
  useNotifyZoom()

  useSubscribe(() =>
    notificationsSignal.subject.pipe(
      // @todo implement Signal / BehaviorSignal / ReplaySignal
      skip(1),
      filter(isDefined),
      mergeMap((notification) => {
        const duration = notification.duration ?? 3000

        const toast = toaster.create({
          title: notification.title,
          description: notification.description,
          duration,
        })

        const sameNotification$ = notificationsSignal.subject.pipe(
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
  )
}
