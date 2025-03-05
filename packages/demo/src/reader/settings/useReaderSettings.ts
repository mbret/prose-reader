import { useObserve } from "reactjrx"
import { of } from "rxjs"
import { useReader } from "../useReader"

export const useReaderSettings = () => {
  const { reader } = useReader()

  return useObserve(() => reader?.settings.values$ ?? of(undefined), [reader])
}
