import { useCallback } from "react"
import { useSubscribe } from "reactjrx"
import { useReader } from "./useReader"

export const usePersistCurrentPagination = () => {
  const { reader } = useReader()

  const persistCurrentPagination = useCallback(
    () =>
      reader?.pagination.state$.subscribe((state) => {
        if (!state.isSettled) return

        localStorage.setItem(`cfi`, state.begin.cfi)
      }),
    [reader],
  )

  useSubscribe(persistCurrentPagination)
}
