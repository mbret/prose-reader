import { useCallback } from "react"
import { useSubscribe } from "reactjrx"
import { skip } from "rxjs"
import { useReader } from "./useReader"

export const usePersistCurrentPagination = () => {
  const { reader } = useReader()

  const persistCurrentPagination = useCallback(
    () =>
      reader?.pagination.state$
        .pipe(
          // skip initial state
          skip(1),
        )
        .subscribe(({ beginCfi = `` }) => {
          localStorage.setItem(`cfi`, beginCfi)
        }),
    [reader],
  )

  useSubscribe(persistCurrentPagination)
}
