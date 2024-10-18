import { fromEvent, map, Observable, switchMap, take } from "rxjs"

export const waitForFrameLoad = (stream: Observable<HTMLIFrameElement>) =>
  stream.pipe(
    switchMap((frame) =>
      fromEvent(frame, `load`).pipe(
        take(1),
        map(() => frame),
      ),
    ),
  )
