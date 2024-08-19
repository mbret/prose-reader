import { useObserve } from "reactjrx"
import { NEVER } from "rxjs"
import { useReader } from "./useReader"

export const usePagination = () => {
  const { reader } = useReader()

  return useObserve(() => reader?.pagination.state$ ?? NEVER, [reader])
}
