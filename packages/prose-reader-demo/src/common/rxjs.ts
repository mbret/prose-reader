import { useEffect, useRef } from "react"
import { Subject } from "rxjs"

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
