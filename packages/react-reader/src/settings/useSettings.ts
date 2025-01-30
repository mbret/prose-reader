import { useObserve } from "reactjrx"
import { useReader } from "../context/useReader"

export const useSettings = () => {
  const reader = useReader()

  return useObserve(() => reader?.settings.values$, [reader])
}
