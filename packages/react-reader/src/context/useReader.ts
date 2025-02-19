import type { Reader } from "@prose-reader/core"
import type { SearchEnhancerAPI } from "@prose-reader/enhancer-search"
import { useContext } from "react"
import { ReaderContext } from "./context"

export const useReader = (): Reader | undefined => {
  const { reader } = useContext(ReaderContext)

  return reader
}

export const hasSearchEnhancer = (
  reader?: Reader,
): reader is Reader & SearchEnhancerAPI => {
  return !!reader && "__PROSE_READER_ENHANCER_SEARCH" in reader
}
