import { isShallowEqual, pick, watchKeys } from "@prose-reader/core"
import { useContext } from "react"
import { useObserve } from "reactjrx"
import { ReaderContext, type ReaderContextType } from "./context"

export const useReaderContextValue = <T extends keyof ReaderContextType>(
  keys: T[],
) => {
  const context = useContext(ReaderContext)

  return useObserve(
    () => context.pipe(watchKeys(keys)),
    {
      compareFn: isShallowEqual,
      defaultValue: pick(context.value, keys),
    },
    [],
  ).data
}

export const useReaderContext = () => {
  return useContext(ReaderContext)
}
