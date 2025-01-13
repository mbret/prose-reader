import { useEffect, useRef } from "react"
import { filter, Observable, Subject } from "rxjs"

export const useUnMount$ = () => {
  const unMount$ = useRef(new Subject<void>())

  useEffect(() => {
    return () => {
      unMount$.current.next()
      unMount$.current.complete()
    }
  }, [unMount$])

  return unMount$.current.asObservable()
}

function inputIsNotNullOrUndefined<T>(input: null | undefined | T): input is T {
  return input !== null && input !== undefined
}

export function isNotNullOrUndefined<T>() {
  return (source$: Observable<null | undefined | T>) =>
    source$.pipe(filter(inputIsNotNullOrUndefined))
}
