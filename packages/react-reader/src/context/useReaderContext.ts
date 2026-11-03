import { isShallowEqual, pick, watchKeys } from "@prose-reader/core"
import { useContext } from "react"
import { useObserve } from "reactjrx"
import { ReaderContext, type ReaderContextType } from "./context"

export const useReaderContext = () => {
  const context = useContext(ReaderContext)

  if (!context) {
    throw new Error(`useReader needs a ReactReader above it`)
  }

  return context
}

export const useReaderContextValue = <T extends keyof ReaderContextType>(
  keys: T[],
) => {
  const context = useReaderContext()

  return useObserve(
    () => context.pipe(watchKeys(keys)),
    {
      compareFn: isShallowEqual,
      defaultValue: pick(context.value, keys),
    },
    [],
  ).data
}
