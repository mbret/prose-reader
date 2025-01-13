import {
  animationFrameScheduler,
  finalize,
  type Observable,
  tap,
  throttleTime,
} from "rxjs"
import type { Reader } from "../../reader"

export const throttleLock =
  ({ reader, duration }: { reader: Reader; duration: number }) =>
  <T>(stream: Observable<T>) => {
    let unlockFn: (() => void) | undefined = undefined
    const unlock = () => {
      unlockFn?.()
      unlockFn = undefined
    }

    return stream.pipe(
      tap(() => {
        if (!unlockFn) {
          unlockFn = reader?.navigation.lock()
        }
      }),
      throttleTime(duration, animationFrameScheduler, {
        trailing: true,
        leading: true,
      }),
      tap(unlock),
      finalize(unlock),
    )
  }
