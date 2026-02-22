import { useCallback } from "react"
import { useSubscribe } from "reactjrx"
import { useReader } from "./useReader"

export const usePersistCurrentPagination = () => {
  const { reader } = useReader()

  const persistCurrentPagination = useCallback(
    () =>
      reader?.pagination.state$.subscribe(({ beginCfi = `` }) => {
        localStorage.setItem(`cfi`, beginCfi)
      }),
    [reader],
  )

  useSubscribe(persistCurrentPagination)
}
