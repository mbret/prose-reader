/* eslint-disable @typescript-eslint/no-explicit-any */
import { defer, Observable, of, OperatorFunction } from "rxjs"
import { first, map, switchMap } from "rxjs/operators"

export const mapKeysTo = <R extends { [key: string]: any }, K extends keyof R>(
  keys: K[],
): OperatorFunction<R, Pick<R, K>> => {
  return map((obj) => {
    return Object.entries(obj).reduce(
      (acc, [key, entry]) => {
        if (keys.includes(key as any)) {
          return {
            ...acc,
            [key]: entry,
          }
        }

        return acc
      },
      {} as Pick<typeof obj, K>,
    )
  })
}

export function observeResize(
  element: HTMLElement,
): Observable<ResizeObserverEntry[]> {
  return new Observable<ResizeObserverEntry[]>((observer) => {
    const resizeObserver = new ResizeObserver((entries) => {
      observer.next(entries)
    })

    resizeObserver.observe(element)

    return () => {
      resizeObserver.disconnect()
    }
  })
}

export const waitForSwitch =
  <O>(waitForStream: Observable<O>) =>
  <N>(stream: Observable<N>) =>
    stream.pipe(
      switchMap((value) =>
        waitForStream.pipe(
          first(),
          map(() => value),
        ),
      ),
    )

export const deferNextResult = <T>(stream: Observable<T>) => {
  let value: { result: T } | undefined

  const sub = stream.subscribe((result) => {
    value = { result: result }
  })

  return () => {
    sub.unsubscribe()

    if (value) {
      return of(value.result)
    }

    return stream
  }
}

export function idle(): Observable<void> {
  return new Observable<void>((observer) => {
    const handle = requestIdleCallback(() => {
      observer.next()
      observer.complete()
    })

    return () => cancelIdleCallback(handle)
  })
}

export function deferIdle<T>(callback: () => Observable<T>) {
  return defer(() => idle().pipe(switchMap(callback)))
}
