import { useCallback } from "react"
import { useSubscribe } from "reactjrx"
import { filter } from "rxjs"
import { useReader } from "./useReader"

export const usePersistCurrentPagination = () => {
  const { reader } = useReader()

  const persistCurrentPagination = useCallback(
    () =>
      reader?.pagination.state$
        .pipe(filter((state) => state.isSettled))
        .subscribe(({ beginCfi }) => {
          if (beginCfi) localStorage.setItem(`cfi`, beginCfi)
        }),
    [reader],
  )

  useSubscribe(persistCurrentPagination)
}
