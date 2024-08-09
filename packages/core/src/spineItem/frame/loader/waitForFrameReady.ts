import { from, Observable, of, switchMap } from "rxjs"

export const waitForFrameReady = (stream: Observable<HTMLIFrameElement>) =>
  stream.pipe(
    switchMap((frame) =>
      from(frame?.contentDocument?.fonts.ready || of(undefined)),
    ),
  )
