export const NOTIFICATION_KEYS = {
  fontScaleChange: "fontScaleChange",
}

/**
 * TODO for now we don't notify cause we can only changes from:
 * - settings (no notification, direct action)
 * - value change from controlled settings (user intent)
 */
export const useFontSizeNotifications = () => {
  // const reader = useReader()
  // const { notificationsSubject, fontSizeMenuOpen } = useReaderContextValue([
  //   "notificationsSubject",
  //   "fontSizeMenuOpen",
  // ])
  // useSubscribe(
  //   () =>
  //     fontSizeMenuOpen
  //       ? EMPTY
  //       : reader?.settings.values$.pipe(
  //           map(({ fontScale }) => fontScale),
  //           distinctUntilChanged(),
  //           skip(1),
  //           tap((fontScale) => {
  //             notificationsSubject.next({
  //               key: NOTIFICATION_KEYS.fontScaleChange,
  //               title: "Font size changed",
  //               description: `${fontScale * 100} %`,
  //             })
  //           }),
  //         ),
  //   [reader, notificationsSubject, fontSizeMenuOpen],
  // )
}
