import { useContext } from "react"
import { useObserve } from "reactjrx"
import { ReaderContext, type ReaderContextType } from "./context"

export const useReaderContextValue = <T extends keyof ReaderContextType>(
  selector: Array<T>,
) => {
  const context = useContext(ReaderContext)

  return useObserve(context, selector)
}

export const useReaderContext = () => {
  return useContext(ReaderContext)
}
