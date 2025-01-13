import { useSubscribe } from "reactjrx"
import { useReader } from "./useReader"

export const usePersistCurrentPagination = () => {
  const { reader } = useReader()

  useSubscribe(
    () =>
      reader?.pagination.state$.subscribe(({ beginCfi = `` }) => {
        localStorage.setItem(`cfi`, beginCfi)
      }),
    [reader],
  )
}
