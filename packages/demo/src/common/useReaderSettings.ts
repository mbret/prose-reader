import { of } from "rxjs"
import { useReader } from "../reader/useReader"
import { useObserve } from "reactjrx"

export const useReaderSettings = () => {
  const { reader } = useReader()

  return useObserve(() => reader?.settings.values$ ?? of(undefined), [reader])
}
