import type { Reader } from "@prose-reader/core"
import { useContext } from "react"
import { ReaderContext } from "./context"

export const useReader = (): Reader | undefined => {
  const context = useContext(ReaderContext)

  return context
}
