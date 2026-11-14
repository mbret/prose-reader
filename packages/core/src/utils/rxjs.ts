import { isShallowEqual } from "@prose-reader/shared"
import {
  defer,
  distinctUntilChanged,
  first,
  map,
  Observable,
  type OperatorFunction,
  switchMap,
} from "rxjs"
import { pick } from "./objects"

export const mapKeysTo = <R extends Record<string, unknown>, K extends keyof R>(
  keys: K[],
): OperatorFunction<R, Pick<R, K>> => {
  return map((obj) => pick(obj, keys))
}

export const watchKeys =
  <R extends Record<string, unknown>, K extends keyof R>(keys: K[]) =>
  (stream: Observable<R>) => {
    return stream.pipe(mapKeysTo(keys), distinctUntilChanged(isShallowEqual))
  }

/**
 * The resize reports of `element`, from an observer of its own for each
 * subscriber. A new observer reports once the size its element has, whatever
 * that size is, then each resize.
 *
 * The observer starts in the next animation frame. A subscriber can come at
 * any moment, such as in a microtask that follows a report. The browser
 * cannot report to an observer started while it reports resizes, and it
 * sends the page an error: "ResizeObserver loop completed with undelivered
 * notifications". The first report comes in the same frame either way.
 */
export function observeResize(
  element: HTMLElement,
): Observable<ResizeObserverEntry[]> {
  return new Observable<ResizeObserverEntry[]>((observer) => {
    // Use the observed element's own realm so observation is correct even
    // when the reader is mounted into a foreign document.
    const view = element.ownerDocument.defaultView ?? window
    const Ctor = view.ResizeObserver ?? ResizeObserver
    const resizeObserver = new Ctor((entries) => {
      observer.next(entries)
    })
    const frameRequest = view.requestAnimationFrame(() => {
      resizeObserver.observe(element)
    })

    return () => {
      view.cancelAnimationFrame(frameRequest)
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

export function idle(): Observable<void> {
  return new Observable<void>((observer) => {
    // webkit does not support requestIdleCallback yet
    if (window.requestIdleCallback) {
      const handle = window.requestIdleCallback(() => {
        observer.next()
        observer.complete()
      })

      return () => cancelIdleCallback(handle)
    }

    const timeout = setTimeout(() => {
      observer.next()
      observer.complete()
    }, 1)

    return () => clearTimeout(timeout)
  })
}

export function deferIdle<T>(callback: () => Observable<T>) {
  return defer(() => idle().pipe(switchMap(callback)))
}

export const observeMutation = (
  target: Node,
  options?: MutationObserverInit,
) => {
  return new Observable<MutationRecord[]>((subscriber) => {
    const Ctor =
      target.ownerDocument?.defaultView?.MutationObserver ?? MutationObserver
    const observer = new Ctor((mutations) => {
      subscriber.next(mutations)
    })

    observer.observe(target, options)

    return () => observer.disconnect()
  })
}

export function observeIntersection(
  element: HTMLElement,
  options?: IntersectionObserverInit,
): Observable<IntersectionObserverEntry[]> {
  return new Observable<IntersectionObserverEntry[]>((observer) => {
    const Ctor =
      element.ownerDocument.defaultView?.IntersectionObserver ??
      IntersectionObserver
    const intersectionObserver = new Ctor((entries) => {
      observer.next(entries)
    }, options)

    intersectionObserver.observe(element)

    return () => {
      intersectionObserver.disconnect()
    }
  })
}
