import { useContext } from "react"
import { ReaderContext } from "./context"

export const useReaderContext = () => {
  return useContext(ReaderContext)
}
