import { useContext } from "react"
import { ReaderContext } from "./context"

export const useReader = () => {
  const context = useContext(ReaderContext)

  return context
}
