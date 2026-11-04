import { useReader } from "@prose-reader/react-reader"
import { useObserve } from "reactjrx"
import { of } from "rxjs"

export const useReaderSettings = () => {
  const reader = useReader()

  return useObserve(() => reader?.settings.values$ ?? of(undefined), [reader])
    .data
}
