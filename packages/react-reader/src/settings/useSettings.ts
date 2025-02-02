import type { Reader } from "@prose-reader/core"
import { useObserve } from "reactjrx"
import { useReader } from "../context/useReader"

export const useSettings = (): Reader["settings"]["values"] | undefined => {
  const reader = useReader()

  return useObserve(() => reader?.settings.values$, [reader])
}
