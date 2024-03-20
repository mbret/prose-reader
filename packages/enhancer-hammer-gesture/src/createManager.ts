import { Reader } from "@prose-reader/core"
import { Observable, switchMap } from "rxjs"

export const createManager = (reader: Reader) => {
  return reader.context.containerElement$.pipe(
    switchMap(
      (container) =>
        new Observable<HammerManager>((observer) => {
          const hammerManager = new Hammer.Manager(container || document.body, {
            recognizers: [
              [Hammer.Pan, { direction: Hammer.DIRECTION_ALL }],
              [Hammer.Pinch, { enable: true }],
              [Hammer.Tap, {}],
              [Hammer.Press, {}],
            ],
          })

          observer.next(hammerManager)

          return () => {
            hammerManager.destroy()
          }
        }),
    ),
  )
}
